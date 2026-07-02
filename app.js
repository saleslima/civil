'use strict';

const STORAGE_KEY = 'copomCivilFolgaConfig:v1';
const THEME_KEY = 'copomCivilTheme:v1';
const NEON_KEY = 'civilOffNeonColor:v1';
const DEFAULT_NEON = '#4bd5ff';
const LOCAL_USER_COUNT_KEY = 'civilOffLocalUserCount:v1';
const OPERATION_MODE_KEY = 'civilOffOperationMode:v1';
const CYCLE_DAYS = 12;
const SINGLE_OFFSETS = new Set([0]);
const DOUBLE_OFFSETS = new Set([6, 7]);

const monthNames = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const compactDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

const elements = {
  calendarPanel: document.querySelector('#calendarPanel'),
  calendarTitle: document.querySelector('#calendarTitle'),
  monthViewport: document.querySelector('#monthViewport'),
  monthGrid: document.querySelector('#monthGrid'),
  previousMonth: document.querySelector('#previousMonth'),
  nextMonth: document.querySelector('#nextMonth'),
  monthPickerButton: document.querySelector('#monthPickerButton'),
  monthPicker: document.querySelector('#monthPicker'),
  todayButton: document.querySelector('#todayButton'),
  selectedCard: document.querySelector('#selectedCard'),
  selectedWeekday: document.querySelector('#selectedWeekday'),
  selectedDate: document.querySelector('#selectedDate'),
  selectedHoliday: document.querySelector('#selectedHoliday'),
  selectedBadge: document.querySelector('#selectedBadge'),
  setupPanel: document.querySelector('#setupPanel'),
  setAnchorButton: document.querySelector('#setAnchorButton'),
  dateDialog: document.querySelector('#dateDialog'),
  dateForm: document.querySelector('#dateForm'),
  anchorDateInput: document.querySelector('#anchorDateInput'),
  cancelDate: document.querySelector('#cancelDate'),
  nextDaysPanel: document.querySelector('#nextDaysPanel'),
  nextDaysList: document.querySelector('#nextDaysList'),
  resetButton: document.querySelector('#resetButton'),
  resetDialog: document.querySelector('#resetDialog'),
  confirmReset: document.querySelector('#confirmReset'),
  statusTitle: document.querySelector('#statusTitle'),
  statusText: document.querySelector('#statusText'),
  statusOrb: document.querySelector('#statusOrb'),
  installButton: document.querySelector('#installButton'),
  userCount: document.querySelector('#userCount'),
  dailyThought: document.querySelector('#dailyThought'),
  mode190Button: document.querySelector('#mode190Button'),
  mode193Button: document.querySelector('#mode193Button'),
  waterResponse: document.querySelector('#waterResponse'),
  neonButton: document.querySelector('#neonButton'),
  neonColorInput: document.querySelector('#neonColorInput'),
  themeButton: document.querySelector('#themeButton'),
  themeColorMeta: document.querySelector('#themeColorMeta'),
  iosInstallDialog: document.querySelector('#iosInstallDialog'),
  toast: document.querySelector('#toast')
};

const today = startOfDay(new Date());
let anchorDate = loadAnchorDate();
let selectedDate = anchorDate || today;
let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
let deferredInstallPrompt = null;
let toastTimer = null;
let installVisibilityTimer = null;
let touchStartX = null;
let activeTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
let activeNeon = loadNeonColor();
let activeOperationMode = loadOperationMode();
let emergencyTimers = [];

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
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
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

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function electronMotionFor(date, type) {
  const seed = hashString(`${toLocalISO(date)}:${type}`);
  const unit = (offset) => (((seed >> offset) & 255) / 255);
  const durationA = 3.2 + unit(0) * 1.8;
  let durationB = 4.3 + unit(8) * 2.3;
  if (Math.abs(durationB - durationA) < 0.55) durationB += 0.7;
  const delayA = -unit(16) * durationA;
  const delayB = -unit(24) * durationB;
  return { durationA, durationB, delayA, delayB };
}


const THINKERS = [
  'Sócrates', 'Platão', 'Aristóteles', 'Sêneca', 'Marco Aurélio', 'Epicteto', 'Confúcio', 'Lao-Tsé',
  'Sun Tzu', 'Maquiavel', 'Descartes', 'Spinoza', 'Pascal', 'Voltaire', 'Rousseau', 'Kant',
  'Hegel', 'Schopenhauer', 'Kierkegaard', 'Nietzsche', 'John Locke', 'David Hume', 'Francis Bacon',
  'Montesquieu', 'Thomas Hobbes', 'John Stuart Mill', 'Hannah Arendt', 'Simone de Beauvoir',
  'Simone Weil', 'Albert Camus', 'Jean-Paul Sartre', 'Michel de Montaigne', 'Blaise Pascal',
  'Heráclito', 'Parmênides', 'Pitágoras', 'Demócrito', 'Epicuro', 'Zenão de Cítio', 'Cícero',
  'Agostinho de Hipona', 'Tomás de Aquino', 'Averróis', 'Avicena', 'Al-Farabi', 'Ibn Khaldun',
  'Maimônides', 'Erasmo de Roterdã', 'Thomas More', 'Giordano Bruno', 'Galileu Galilei',
  'Isaac Newton', 'Charles Darwin', 'Marie Curie', 'Ada Lovelace', 'Alan Turing', 'Bertrand Russell',
  'Karl Popper', 'Thomas Kuhn', 'Viktor Frankl', 'Carl Jung', 'William James', 'John Dewey',
  'Paulo Freire', 'Rubem Alves', 'Machado de Assis', 'Fernando Pessoa', 'Clarice Lispector',
  'Mahatma Gandhi', 'Martin Luther King Jr.', 'Nelson Mandela', 'Malala Yousafzai', 'Ailton Krenak'
];

const THOUGHT_PATTERNS = [
  (name) => `A disciplina transforma intenção em caminho — reflexão inspirada em ${name}.`,
  (name) => `Quem observa com atenção escolhe com mais sabedoria — reflexão inspirada em ${name}.`,
  (name) => `A coragem começa quando o dever supera o medo — reflexão inspirada em ${name}.`,
  (name) => `Toda mudança consistente nasce de um pequeno gesto repetido — reflexão inspirada em ${name}.`,
  (name) => `Conhecer a si mesmo torna mais claro o próximo passo — reflexão inspirada em ${name}.`
];

const DAILY_THOUGHTS = THINKERS.flatMap((thinker) => THOUGHT_PATTERNS.map((pattern) => pattern(thinker))).slice(0, 365);

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0, 12);
  return Math.floor((date - start) / 86400000);
}

function renderDailyThought() {
  if (!elements.dailyThought) return;
  const index = (dayOfYear(today) - 1) % DAILY_THOUGHTS.length;
  elements.dailyThought.textContent = DAILY_THOUGHTS[index];
}

function loadLocalUserCount() {
  try {
    const saved = Number.parseInt(localStorage.getItem(LOCAL_USER_COUNT_KEY) || '1', 10);
    const count = Number.isFinite(saved) && saved > 0 ? saved : 1;
    localStorage.setItem(LOCAL_USER_COUNT_KEY, String(count));
    return count;
  } catch {
    return 1;
  }
}

function renderLocalUserCount() {
  if (!elements.userCount) return;
  // O contador real é preenchido pelo Firebase em firebase-devices.js.
  // Mantém o traço enquanto o banco carrega, sem somar usuário local falso.
  elements.userCount.textContent = elements.userCount.textContent || '—';
}

function loadOperationMode() {
  try {
    return localStorage.getItem(OPERATION_MODE_KEY) === '193' ? '193' : '190';
  } catch {
    return '190';
  }
}

function clearEmergencyTimers() {
  emergencyTimers.forEach((timer) => clearTimeout(timer));
  emergencyTimers = [];
}

function setOperationMode(mode, replay = true, persist = true) {
  activeOperationMode = mode === '193' ? '193' : '190';

  if (persist) {
    try {
      localStorage.setItem(OPERATION_MODE_KEY, activeOperationMode);
    } catch {
      // O modo continua ativo nesta sessão mesmo sem armazenamento.
    }
  }
  clearEmergencyTimers();
  document.documentElement.dataset.operationMode = activeOperationMode;
  document.documentElement.classList.remove('fire-phase', 'water-phase', 'smoke-phase', 'emergency-revealed');

  const is193 = activeOperationMode === '193';
  elements.mode190Button?.classList.toggle('active', !is193);
  elements.mode193Button?.classList.toggle('active', is193);
  elements.mode190Button?.setAttribute('aria-pressed', String(!is193));
  elements.mode193Button?.setAttribute('aria-pressed', String(is193));

  if (elements.neonButton) elements.neonButton.disabled = is193;

  if (!is193) {
    applyNeonColor(activeNeon);
    applyTheme(activeTheme);
    return;
  }

  document.documentElement.style.setProperty('--neon', '#ff2a18');
  document.documentElement.style.setProperty('--neon-rgb', '255, 42, 24');
  if (elements.themeColorMeta) elements.themeColorMeta.setAttribute('content', '#1a0804');

  if (!replay || !anchorDate) {
    document.documentElement.classList.add('emergency-revealed');
    return;
  }

  document.documentElement.classList.add('fire-phase');
  elements.mode193Button?.setAttribute('aria-busy', 'true');

  emergencyTimers.push(setTimeout(() => {
    document.documentElement.classList.remove('fire-phase');
    document.documentElement.classList.add('water-phase');
  }, 5000));

  emergencyTimers.push(setTimeout(() => {
    document.documentElement.classList.remove('water-phase');
    document.documentElement.classList.add('smoke-phase');
  }, 7200));

  emergencyTimers.push(setTimeout(() => {
    document.documentElement.classList.remove('smoke-phase');
    document.documentElement.classList.add('emergency-revealed');
    elements.mode193Button?.removeAttribute('aria-busy');
  }, 9100));
}

function normalizeNeonColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value.toLowerCase() : DEFAULT_NEON;
}

function neonRgb(value) {
  const hex = normalizeNeonColor(value).slice(1);
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function loadNeonColor() {
  try {
    return normalizeNeonColor(localStorage.getItem(NEON_KEY));
  } catch {
    return DEFAULT_NEON;
  }
}

function applyNeonColor(value, persist = false) {
  activeNeon = normalizeNeonColor(value);
  const [red, green, blue] = neonRgb(activeNeon);
  document.documentElement.style.setProperty('--neon', activeNeon);
  document.documentElement.style.setProperty('--neon-rgb', `${red}, ${green}, ${blue}`);

  if (elements.neonColorInput) elements.neonColorInput.value = activeNeon;
  if (elements.neonButton) {
    elements.neonButton.setAttribute('aria-label', `Escolher cor neon. Cor atual ${activeNeon}`);
    elements.neonButton.setAttribute('title', `Cor neon atual: ${activeNeon}`);
  }

  if (persist) {
    try {
      localStorage.setItem(NEON_KEY, activeNeon);
    } catch {
      // A cor permanece ativa nesta sessão mesmo sem acesso ao armazenamento.
    }
  }
}

function openNeonPicker() {
  if (!elements.neonColorInput) return;
  elements.neonColorInput.value = activeNeon;

  try {
    if (typeof elements.neonColorInput.showPicker === 'function') {
      elements.neonColorInput.showPicker();
    } else {
      elements.neonColorInput.click();
    }
  } catch {
    elements.neonColorInput.click();
  }
}

function applyTheme(theme, persist = false) {
  activeTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = activeTheme;
  document.documentElement.style.colorScheme = activeTheme;

  if (elements.themeButton) {
    const isLight = activeTheme === 'light';
    elements.themeButton.setAttribute('aria-label', isLight ? 'Ativar modo noturno' : 'Ativar modo dia');
    elements.themeButton.setAttribute('title', isLight ? 'Modo noturno' : 'Modo dia');
    elements.themeButton.setAttribute('aria-pressed', String(isLight));
  }

  if (elements.themeColorMeta) {
    const themeColor = activeOperationMode === '193'
      ? '#1a0804'
      : (activeTheme === 'light' ? '#eef6fb' : '#07111f');
    elements.themeColorMeta.setAttribute('content', themeColor);
  }

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, activeTheme);
    } catch {
      // O tema continua ativo nesta sessão mesmo sem acesso ao armazenamento.
    }
  }
}

function toggleTheme() {
  applyTheme(activeTheme === 'light' ? 'dark' : 'light', true);
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
    version: 2
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
  const addDate = (date, name, type) => map.set(toLocalISO(date), { name, type });

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
  const position = ((delta % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
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

function createBlankCell() {
  const blank = document.createElement('span');
  blank.className = 'calendar-day blank';
  blank.setAttribute('aria-hidden', 'true');
  return blank;
}

function renderCalendar(direction = 0) {
  if (!anchorDate) return;

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1, 12).getDay();
  const holidays = getHolidays(year);
  const fragment = document.createDocumentFragment();

  elements.calendarTitle.textContent = titleCase(monthNames.format(visibleMonth));
  elements.monthPicker.value = `${year}-${String(month + 1).padStart(2, '0')}`;

  for (let index = 0; index < firstWeekday; index += 1) fragment.appendChild(createBlankCell());

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12);
    const iso = toLocalISO(date);
    const holiday = holidays.get(iso);
    const type = scheduleTypeFor(date);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day';
    cell.dataset.date = iso;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-selected', String(sameDate(date, selectedDate)));
    cell.setAttribute('aria-label', `${fullDate.format(date)}${holiday ? `, ${holiday.name}` : ''}, ${scheduleLabel(type)}`);

    if (sameDate(date, today)) cell.classList.add('today');
    if (sameDate(date, selectedDate)) cell.classList.add('selected');
    if (holiday) cell.classList.add('holiday');
    if (type === 'single') cell.classList.add('single-off');
    if (type === 'double') cell.classList.add('double-off');

    const number = document.createElement('strong');
    number.textContent = String(day);
    cell.appendChild(number);

    if (type === 'single' || type === 'double') {
      const motion = electronMotionFor(date, type);
      cell.style.setProperty('--electron-a-duration', `${motion.durationA.toFixed(2)}s`);
      cell.style.setProperty('--electron-b-duration', `${motion.durationB.toFixed(2)}s`);
      cell.style.setProperty('--electron-a-delay', `${motion.delayA.toFixed(2)}s`);
      cell.style.setProperty('--electron-b-delay', `${motion.delayB.toFixed(2)}s`);

      const orbitA = document.createElement('span');
      orbitA.className = 'electron-orbit electron-a';
      orbitA.setAttribute('aria-hidden', 'true');
      const electronA = document.createElement('i');
      orbitA.appendChild(electronA);

      const orbitB = document.createElement('span');
      orbitB.className = 'electron-orbit electron-b';
      orbitB.setAttribute('aria-hidden', 'true');
      const electronB = document.createElement('i');
      orbitB.appendChild(electronB);

      const collisionFlash = document.createElement('span');
      collisionFlash.className = 'electron-collision-flash';
      collisionFlash.setAttribute('aria-hidden', 'true');

      const fireLayer = document.createElement('span');
      fireLayer.className = 'fire-layer';
      fireLayer.setAttribute('aria-hidden', 'true');
      fireLayer.innerHTML = '<img src="flame.gif" class="flame-gif" alt="">';

      const smokeLayer = document.createElement('span');
      smokeLayer.className = 'smoke-layer';
      smokeLayer.setAttribute('aria-hidden', 'true');
      smokeLayer.innerHTML = '<i></i><i></i><i></i><i></i>';

      cell.append(orbitA, orbitB, collisionFlash, fireLayer, smokeLayer);

      const mark = document.createElement('small');
      mark.textContent = type === 'single' ? 'U' : 'D';
      mark.setAttribute('aria-hidden', 'true');
      cell.appendChild(mark);
    }

    if (holiday) {
      const pin = document.createElement('span');
      pin.className = 'holiday-pin';
      pin.setAttribute('aria-hidden', 'true');
      cell.appendChild(pin);
    }

    cell.addEventListener('click', () => selectDate(date));
    fragment.appendChild(cell);
  }

  const totalCells = firstWeekday + daysInMonth;
  const trailingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let index = 0; index < trailingCells; index += 1) fragment.appendChild(createBlankCell());

  elements.monthGrid.replaceChildren(fragment);
  renderSelectedDate();

  elements.monthGrid.classList.remove('slide-previous', 'slide-next');
  if (direction !== 0) {
    void elements.monthGrid.offsetWidth;
    elements.monthGrid.classList.add(direction > 0 ? 'slide-next' : 'slide-previous');
  }
}

function selectDate(date) {
  selectedDate = startOfDay(date);
  elements.monthGrid.querySelectorAll('.calendar-day[data-date]').forEach((cell) => {
    const isSelected = cell.dataset.date === toLocalISO(selectedDate);
    cell.classList.toggle('selected', isSelected);
    cell.setAttribute('aria-selected', String(isSelected));
  });
  renderSelectedDate();
}

function renderSelectedDate() {
  if (!anchorDate) return;
  const holiday = getHolidays(selectedDate.getFullYear()).get(toLocalISO(selectedDate));
  const type = scheduleTypeFor(selectedDate);

  elements.selectedWeekday.textContent = titleCase(weekdayLong.format(selectedDate));
  elements.selectedDate.textContent = fullDate.format(selectedDate);
  elements.selectedHoliday.textContent = holiday ? `${holiday.name} · ${holiday.type}` : '';
  elements.selectedBadge.className = 'selected-badge neutral';
  elements.selectedBadge.textContent = scheduleLabel(type).toUpperCase();
  if (type) elements.selectedBadge.classList.add(type);
}

function renderAppState() {
  const hasAnchor = Boolean(anchorDate);
  elements.setupPanel.hidden = hasAnchor;
  elements.calendarPanel.hidden = !hasAnchor;
  elements.selectedCard.hidden = !hasAnchor;
  elements.nextDaysPanel.hidden = !hasAnchor;
  elements.resetButton.hidden = !hasAnchor;
  if (elements.neonButton) elements.neonButton.hidden = !hasAnchor;
  elements.statusOrb.classList.toggle('active', hasAnchor);

  if (!hasAnchor) {
    elements.statusTitle.textContent = 'Nenhuma data definida';
    elements.statusText.textContent = 'Defina a primeira folga unitária para gerar a escala.';
    elements.nextDaysList.replaceChildren();
    return;
  }

  elements.statusTitle.textContent = `Base: ${anchorDate.getDate().toString().padStart(2, '0')}/${(anchorDate.getMonth() + 1).toString().padStart(2, '0')}`;
  elements.statusText.textContent = '';
  renderCalendar();
  renderNextDays();
}

function getNextOffDays(limit = 6) {
  if (!anchorDate) return [];
  const results = [];
  let cursor = diffDays(today, anchorDate) >= 0 ? today : anchorDate;
  let safety = 0;

  while (results.length < limit && safety < 730) {
    const type = scheduleTypeFor(cursor);
    if (type === 'single' || type === 'double') results.push({ date: cursor, type });
    cursor = addDays(cursor, 1);
    safety += 1;
  }
  return results;
}

function renderNextDays() {
  const fragment = document.createDocumentFragment();

  getNextOffDays(6).forEach(({ date, type }) => {
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
      selectedDate = startOfDay(date);
      visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1, 12);
      renderCalendar();
      elements.calendarPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    fragment.appendChild(row);
  });

  elements.nextDaysList.replaceChildren(fragment);
}


let electronCollisionWatcherStarted = false;

function startElectronCollisionWatcher() {
  if (electronCollisionWatcherStarted) return;
  electronCollisionWatcherStarted = true;

  const watch = () => {
    document.querySelectorAll('.calendar-day.single-off, .calendar-day.double-off').forEach((cell) => {
      const electronA = cell.querySelector('.electron-a i');
      const electronB = cell.querySelector('.electron-b i');
      if (!electronA || !electronB) return;

      const a = electronA.getBoundingClientRect();
      const b = electronB.getBoundingClientRect();
      if (!a.width || !b.width) return;

      const ax = a.left + a.width / 2;
      const ay = a.top + a.height / 2;
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      const distance = Math.hypot(ax - bx, ay - by);
      const near = cell.dataset.electronsNear === 'true';

      if (distance <= 8 && !near) {
        const bounds = cell.getBoundingClientRect();
        const collisionX = ((ax + bx) / 2) - bounds.left;
        const collisionY = ((ay + by) / 2) - bounds.top;

        cell.dataset.electronsNear = 'true';
        cell.style.setProperty('--collision-x', `${collisionX}px`);
        cell.style.setProperty('--collision-y', `${collisionY}px`);
        cell.classList.remove('electron-collision');
        void cell.offsetWidth;
        cell.classList.add('electron-collision');

        window.setTimeout(() => {
          if (cell.isConnected) cell.classList.remove('electron-collision');
        }, 520);
      } else if (distance >= 13) {
        cell.dataset.electronsNear = 'false';
      }
    });

    window.requestAnimationFrame(watch);
  };

  window.requestAnimationFrame(watch);
}

function shiftMonth(amount) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1, 12);
  selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
  renderCalendar(amount);
}

function openDatePicker() {
  elements.anchorDateInput.value = toLocalISO(today);
  elements.dateDialog.showModal();
  try {
    if (typeof elements.anchorDateInput.showPicker === 'function') elements.anchorDateInput.showPicker();
    else {
      elements.anchorDateInput.focus();
      elements.anchorDateInput.click();
    }
  } catch {
    elements.anchorDateInput.focus();
  }
}

function setAnchorFromInput(event) {
  event.preventDefault();
  const pickedDate = fromLocalISO(elements.anchorDateInput.value);
  if (!pickedDate) {
    showToast('Escolha uma data válida.');
    return;
  }

  anchorDate = startOfDay(pickedDate);
  selectedDate = anchorDate;
  visibleMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 12);
  saveAnchorDate(anchorDate);
  elements.dateDialog.close();
  renderAppState();
  showToast('Folga unitária definida e salva.');
  setTimeout(() => elements.calendarPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
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

  elements.installButton.classList.remove('hidden');
  clearTimeout(installVisibilityTimer);
  installVisibilityTimer = setTimeout(() => {
    elements.installButton.classList.add('hidden');
  }, 60000);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    clearTimeout(installVisibilityTimer);
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

elements.setAnchorButton.addEventListener('click', openDatePicker);
elements.cancelDate.addEventListener('click', () => elements.dateDialog.close());
elements.dateForm.addEventListener('submit', setAnchorFromInput);
elements.previousMonth.addEventListener('click', () => shiftMonth(-1));
elements.nextMonth.addEventListener('click', () => shiftMonth(1));
elements.todayButton.addEventListener('click', () => {
  selectedDate = today;
  visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  renderCalendar();
});
elements.monthPickerButton.addEventListener('click', () => {
  try {
    if (typeof elements.monthPicker.showPicker === 'function') elements.monthPicker.showPicker();
    else elements.monthPicker.click();
  } catch {
    elements.monthPicker.click();
  }
});
elements.monthPicker.addEventListener('change', (event) => {
  const [year, month] = event.target.value.split('-').map(Number);
  if (!year || !month) return;
  const direction = new Date(year, month - 1, 1) > visibleMonth ? 1 : -1;
  visibleMonth = new Date(year, month - 1, 1, 12);
  selectedDate = new Date(year, month - 1, 1, 12);
  renderCalendar(direction);
});
elements.monthViewport.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0]?.clientX ?? null;
}, { passive: true });
elements.monthViewport.addEventListener('touchend', (event) => {
  if (touchStartX === null) return;
  const endX = event.changedTouches[0]?.clientX ?? touchStartX;
  const distance = endX - touchStartX;
  touchStartX = null;
  if (Math.abs(distance) < 55) return;
  shiftMonth(distance < 0 ? 1 : -1);
}, { passive: true });
elements.resetButton.addEventListener('click', () => elements.resetDialog.showModal());
elements.confirmReset.addEventListener('click', resetScale);
elements.neonButton.addEventListener('click', openNeonPicker);
elements.neonColorInput.addEventListener('input', (event) => applyNeonColor(event.target.value));
elements.neonColorInput.addEventListener('change', (event) => {
  applyNeonColor(event.target.value, true);
  showToast('Cor neon salva.');
});
elements.mode190Button.addEventListener('click', () => setOperationMode('190'));
elements.mode193Button.addEventListener('click', () => setOperationMode('193', true));
elements.themeButton.addEventListener('click', toggleTheme);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    anchorDate = loadAnchorDate();
    if (anchorDate) {
      selectedDate = selectedDate || anchorDate;
      visibleMonth = visibleMonth || new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 12);
    }
    renderAppState();
  }
});

renderDailyThought();
renderLocalUserCount();
applyNeonColor(activeNeon);
applyTheme(activeTheme);
setOperationMode(activeOperationMode, false, false);
setupInstallFlow();
registerServiceWorker();
renderAppState();
startElectronCollisionWatcher();
