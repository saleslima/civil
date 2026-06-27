'use strict';

const STORAGE_KEY = 'copomCivilFolgaConfig:v1';
const CYCLE_DAYS = 12;
const SINGLE_OFFSETS = new Set([0]);
const DOUBLE_OFFSETS = new Set([5, 6]);

const monthNames = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const weekdayShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const compactDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

const elements = {
  calendarTitle: document.querySelector('#calendarTitle'),
  calendarScroller: document.querySelector('#calendarScroller'),
  previousMonth: document.querySelector('#previousMonth'),
  nextMonth: document.querySelector('#nextMonth'),
  monthPickerButton: document.querySelector('#monthPickerButton'),
  monthPicker: document.querySelector('#monthPicker'),
  todayButton: document.querySelector('#todayButton'),
  selectedWeekday: document.querySelector('#selectedWeekday'),
  selectedDate: document.querySelector('#selectedDate'),
  selectedHoliday: document.querySelector('#selectedHoliday'),
  selectedBadge: document.querySelector('#selectedBadge'),
  setupPanel: document.querySelector('#setupPanel'),
  setAnchorButton: document.querySelector('#setAnchorButton'),
  nextDaysPanel: document.querySelector('#nextDaysPanel'),
  nextDaysList: document.querySelector('#nextDaysList'),
  resetButton: document.querySelector('#resetButton'),
  resetDialog: document.querySelector('#resetDialog'),
  confirmReset: document.querySelector('#confirmReset'),
  statusTitle: document.querySelector('#statusTitle'),
  statusText: document.querySelector('#statusText'),
  statusOrb: document.querySelector('#statusOrb'),
  installButton: document.querySelector('#installButton'),
  iosInstallDialog: document.querySelector('#iosInstallDialog'),
  toast: document.querySelector('#toast')
};

const today = startOfDay(new Date());
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
let selectedDate = today;
let anchorDate = loadAnchorDate();
let deferredInstallPrompt = null;
let toastTimer = null;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function toLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromLocalISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, amount) {
  const result = startOfDay(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function diffDays(later, earlier) {
  const utcLater = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const utcEarlier = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((utcLater - utcEarlier) / 86400000);
}

function sameDate(a, b) {
  return Boolean(a && b) && toLocalISO(a) === toLocalISO(b);
}

function titleCase(text) {
  return text ? text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1) : text;
}

function loadAnchorDate() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return fromLocalISO(saved?.anchorDate);
  } catch {
    return null;
  }
}

function saveAnchorDate(date) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    anchorDate: toLocalISO(date),
    savedAt: new Date().toISOString(),
    version: 1
  }));
}

function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function getHolidays(year) {
  const map = new Map();
  const add = (month, day, name, type = 'Feriado nacional') => {
    map.set(toLocalISO(new Date(year, month - 1, day, 12)), { name, type });
  };
  const addDate = (date, name, type) => {
    map.set(toLocalISO(date), { name, type });
  };

  add(1, 1, 'Confraternização Universal');
  add(4, 21, 'Tiradentes');
  add(5, 1, 'Dia Mundial do Trabalho');
  add(7, 9, 'Revolução Constitucionalista', 'Feriado estadual de São Paulo');
  add(9, 7, 'Independência do Brasil');
  add(10, 12, 'Nossa Senhora Aparecida');
  add(11, 2, 'Finados');
  add(11, 15, 'Proclamação da República');
  add(11, 20, 'Dia Nacional de Zumbi e da Consciência Negra');
  add(12, 25, 'Natal');

  const easter = calculateEaster(year);
  addDate(addDays(easter, -2), 'Paixão de Cristo', 'Feriado nacional');
  addDate(addDays(easter, -48), 'Carnaval — segunda-feira', 'Ponto facultativo');
  addDate(addDays(easter, -47), 'Carnaval — terça-feira', 'Ponto facultativo');
  addDate(addDays(easter, -46), 'Quarta-feira de Cinzas', 'Ponto facultativo até as 14h');
  addDate(addDays(easter, 60), 'Corpus Christi', 'Ponto facultativo');

  return map;
}

function scheduleTypeFor(date) {
  if (!anchorDate) return null;
  const delta = diffDays(date, anchorDate);
  if (delta < 0) return null;
  const position = delta % CYCLE_DAYS;
  if (SINGLE_OFFSETS.has(position)) return 'single';
  if (DOUBLE_OFFSETS.has(position)) return 'double';
  return 'work';
}

function scheduleLabel(type) {
  if (type === 'single') return 'Folga unitária';
  if (type === 'double') return 'Folga dupla';
  if (type === 'work') return 'Dia de trabalho';
  return 'Sem classificação';
}

function renderCalendar({ focusSelected = false } = {}) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidays = getHolidays(year);

  elements.calendarTitle.textContent = titleCase(monthNames.format(visibleMonth));
  elements.monthPicker.value = `${year}-${String(month + 1).padStart(2, '0')}`;
  elements.calendarScroller.replaceChildren();

  const fragment = document.createDocumentFragment();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12);
    const iso = toLocalISO(date);
    const holiday = holidays.get(iso);
    const scheduleType = scheduleTypeFor(date);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'day-card';
    card.dataset.date = iso;
    card.setAttribute('role', 'option');
    card.setAttribute('aria-label', `${fullDate.format(date)}${holiday ? `, ${holiday.name}` : ''}${scheduleType ? `, ${scheduleLabel(scheduleType)}` : ''}`);
    card.setAttribute('aria-selected', String(sameDate(date, selectedDate)));

    if (sameDate(date, today)) card.classList.add('today');
    if (sameDate(date, selectedDate)) card.classList.add('selected');
    if (holiday) card.classList.add('holiday');
    if (scheduleType === 'single') card.classList.add('single-off');
    if (scheduleType === 'double') card.classList.add('double-off');

    const weekday = document.createElement('span');
    weekday.className = 'weekday';
    weekday.textContent = weekdayShort.format(date).replace('.', '');

    const number = document.createElement('strong');
    number.className = 'day-number';
    number.textContent = String(day);

    const status = document.createElement('span');
    status.className = 'day-status';
    if (scheduleType === 'single') status.textContent = 'Unitária';
    else if (scheduleType === 'double') status.textContent = 'Dupla';
    else if (holiday) status.textContent = 'Feriado';
    else status.textContent = '—';

    card.append(weekday, number, status);
    card.addEventListener('click', () => selectDate(date));
    fragment.appendChild(card);
  }

  elements.calendarScroller.appendChild(fragment);
  renderSelectedDate();

  requestAnimationFrame(() => {
    const selector = focusSelected
      ? `[data-date="${toLocalISO(selectedDate)}"]`
      : `[data-date="${toLocalISO(today)}"]`;
    const target = elements.calendarScroller.querySelector(selector)
      || elements.calendarScroller.querySelector('.selected')
      || elements.calendarScroller.firstElementChild;
    target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });
}

function selectDate(date) {
  selectedDate = startOfDay(date);

  if (selectedDate.getFullYear() !== visibleMonth.getFullYear() || selectedDate.getMonth() !== visibleMonth.getMonth()) {
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
    renderCalendar({ focusSelected: true });
    return;
  }

  elements.calendarScroller.querySelectorAll('.day-card').forEach((card) => {
    const isSelected = card.dataset.date === toLocalISO(selectedDate);
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-selected', String(isSelected));
  });

  renderSelectedDate();
}

function renderSelectedDate() {
  const holiday = getHolidays(selectedDate.getFullYear()).get(toLocalISO(selectedDate));
  const type = scheduleTypeFor(selectedDate);

  elements.selectedWeekday.textContent = titleCase(weekdayLong.format(selectedDate));
  elements.selectedDate.textContent = fullDate.format(selectedDate);
  elements.selectedHoliday.textContent = holiday ? `${holiday.name} · ${holiday.type}` : '';
  elements.selectedBadge.className = 'selected-badge neutral';
  elements.selectedBadge.textContent = scheduleLabel(type).toUpperCase();

  if (type) elements.selectedBadge.classList.add(type);
  elements.setAnchorButton.disabled = Boolean(anchorDate);
}

function renderAppState() {
  const hasAnchor = Boolean(anchorDate);
  elements.setupPanel.hidden = hasAnchor;
  elements.nextDaysPanel.hidden = !hasAnchor;
  elements.resetButton.hidden = !hasAnchor;
  elements.statusOrb.classList.toggle('active', hasAnchor);

  if (!hasAnchor) {
    elements.statusTitle.textContent = 'Nenhuma data definida';
    elements.statusText.textContent = 'Escolha um dia no calendário para iniciar o ciclo.';
    elements.setAnchorButton.disabled = false;
    elements.nextDaysList.replaceChildren();
  } else {
    elements.statusTitle.textContent = `Base: ${fullDate.format(anchorDate)}`;
    elements.statusText.textContent = 'Configuração salva neste aparelho. Recarregar ou fechar a página não altera a escala.';
    renderNextDays();
  }

  renderCalendar({ focusSelected: true });
}

function getNextOffDays(limit = 6) {
  if (!anchorDate) return [];
  const results = [];
  let cursor = diffDays(today, anchorDate) >= 0 ? today : anchorDate;
  let safety = 0;

  while (results.length < limit && safety < 365) {
    const type = scheduleTypeFor(cursor);
    if (type === 'single' || type === 'double') {
      results.push({ date: cursor, type });
    }
    cursor = addDays(cursor, 1);
    safety += 1;
  }

  return results;
}

function renderNextDays() {
  const days = getNextOffDays(6);
  const fragment = document.createDocumentFragment();

  days.forEach(({ date, type }) => {
    const holiday = getHolidays(date.getFullYear()).get(toLocalISO(date));
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'next-item';
    row.setAttribute('aria-label', `Abrir ${fullDate.format(date)}, ${scheduleLabel(type)}`);

    const dayNumber = document.createElement('span');
    dayNumber.className = 'next-item-date';
    dayNumber.textContent = String(date.getDate()).padStart(2, '0');

    const info = document.createElement('span');
    info.className = 'next-item-info';
    const title = document.createElement('strong');
    title.textContent = `${titleCase(weekdayLong.format(date))}, ${compactDate.format(date)}`;
    const detail = document.createElement('small');
    detail.textContent = holiday ? holiday.name : 'Escala calculada automaticamente';
    info.append(title, detail);

    const tag = document.createElement('span');
    tag.className = `next-item-tag ${type}`;
    tag.textContent = type === 'single' ? 'Unitária' : 'Dupla';

    row.append(dayNumber, info, tag);
    row.addEventListener('click', () => {
      selectedDate = date;
      visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1, 12);
      renderCalendar({ focusSelected: true });
      window.scrollTo({ top: document.querySelector('.calendar-panel').offsetTop - 12, behavior: 'smooth' });
    });
    fragment.appendChild(row);
  });

  elements.nextDaysList.replaceChildren(fragment);
}

function shiftMonth(amount) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1, 12);
  selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
  renderCalendar({ focusSelected: true });
}

function setAnchor() {
  anchorDate = startOfDay(selectedDate);
  saveAnchorDate(anchorDate);
  showToast('Escala salva neste aparelho.');
  renderAppState();
}

function resetScale() {
  localStorage.removeItem(STORAGE_KEY);
  anchorDate = null;
  selectedDate = today;
  visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  showToast('Escala apagada. Escolha uma nova data-base.');
  renderAppState();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2800);
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function setupInstallFlow() {
  if (isStandalone()) {
    elements.installButton.classList.add('hidden');
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    elements.installButton.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    elements.installButton.classList.add('hidden');
    showToast('Aplicativo instalado.');
  });

  elements.installButton.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return;
    }

    if (isIOS()) {
      elements.iosInstallDialog.showModal();
      return;
    }

    showToast('Abra o menu do navegador e escolha “Instalar aplicativo”.');
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        showToast('Modo offline indisponível neste navegador.');
      });
    });
  }
}

elements.previousMonth.addEventListener('click', () => shiftMonth(-1));
elements.nextMonth.addEventListener('click', () => shiftMonth(1));
elements.todayButton.addEventListener('click', () => {
  selectedDate = today;
  visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  renderCalendar({ focusSelected: true });
});
elements.monthPickerButton.addEventListener('click', () => {
  if (typeof elements.monthPicker.showPicker === 'function') elements.monthPicker.showPicker();
  else elements.monthPicker.click();
});
elements.monthPicker.addEventListener('change', (event) => {
  const [year, month] = event.target.value.split('-').map(Number);
  if (!year || !month) return;
  visibleMonth = new Date(year, month - 1, 1, 12);
  selectedDate = new Date(year, month - 1, 1, 12);
  renderCalendar({ focusSelected: true });
});
elements.setAnchorButton.addEventListener('click', setAnchor);
elements.resetButton.addEventListener('click', () => elements.resetDialog.showModal());
elements.confirmReset.addEventListener('click', resetScale);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    anchorDate = loadAnchorDate();
    renderAppState();
  }
});

setupInstallFlow();
registerServiceWorker();
renderAppState();
