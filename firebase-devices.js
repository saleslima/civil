import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js';
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
  serverTimestamp,
  remove
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDd3vBArUAfyoNv7PjmSgr-OUl3r9xns',
  authDomain: 'civiloff.firebaseapp.com',
  databaseURL: 'https://civiloff-default-rtdb.firebaseio.com',
  projectId: 'civiloff',
  storageBucket: 'civiloff.firebasestorage.app',
  messagingSenderId: '790025176243',
  appId: '1:790025176243:web:53845941768a7f501f1cc6',
  measurementId: 'G-3G5RG8KK6E'
};

const DEVICE_ID_KEY = 'civilOffDeviceId:v2';
const LEGACY_USER_ID_KEY = 'civilOffFirebaseUserId:v1';
const DEVICES_ROOT = 'deviceIds/civiloff';
const LEGACY_PRESENCE_ROOT = 'presence/civiloff/onlineUsers';

const userCountElement = document.querySelector('#userCount');
const userCounterElement = userCountElement?.closest('.user-counter');

function safeRandomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();

  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(4);
    window.crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(36)).join('-');
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function normalizeFirebaseKey(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 140);
}

function loadOrCreateDeviceId() {
  try {
    const saved = normalizeFirebaseKey(localStorage.getItem(DEVICE_ID_KEY));
    if (saved.startsWith('device_')) return saved;

    const created = normalizeFirebaseKey(`device_${safeRandomId()}`);
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return normalizeFirebaseKey(`device_session_${safeRandomId()}`);
  }
}

function getLegacyUserId() {
  try {
    const legacy = normalizeFirebaseKey(localStorage.getItem(LEGACY_USER_ID_KEY));
    return legacy.startsWith('user_') ? legacy : '';
  } catch {
    return '';
  }
}

function countDirectChildren(snapshot) {
  let total = 0;
  snapshot.forEach(() => {
    total += 1;
  });
  return total;
}

function renderCount(value, status = 'ok') {
  if (!userCountElement) return;

  const count = Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
  userCountElement.textContent = String(count);

  if (!userCounterElement) return;
  userCounterElement.dataset.counterStatus = status;
  userCounterElement.setAttribute(
    'aria-label',
    `${count} ${count === 1 ? 'dispositivo único cadastrado' : 'dispositivos únicos cadastrados'}`
  );
  userCounterElement.setAttribute(
    'title',
    `${count} ${count === 1 ? 'dispositivo único já abriu esta página' : 'dispositivos únicos já abriram esta página'}`
  );
}

function renderUnavailable() {
  if (!userCountElement) return;
  userCountElement.textContent = '—';

  if (!userCounterElement) return;
  userCounterElement.dataset.counterStatus = 'unavailable';
  userCounterElement.setAttribute('aria-label', 'Contador de dispositivos indisponível');
  userCounterElement.setAttribute('title', 'Verifique a conexão, o Firebase Realtime Database e as regras do banco.');
}

const app = initializeApp(firebaseConfig);

isAnalyticsSupported()
  .then((supported) => {
    if (supported) getAnalytics(app);
  })
  .catch(() => {
    // Analytics não é necessário para o contador funcionar.
  });

try {
  const database = getDatabase(app);
  const deviceId = loadOrCreateDeviceId();
  const devicesRef = ref(database, DEVICES_ROOT);
  const currentDeviceRef = ref(database, `${DEVICES_ROOT}/${deviceId}`);

  onValue(devicesRef, (snapshot) => {
    renderCount(countDirectChildren(snapshot));
  }, () => {
    renderUnavailable();
  });

  runTransaction(currentDeviceRef, (currentData) => {
    if (currentData && typeof currentData === 'object') {
      return {
        ...currentData,
        deviceKey: deviceId,
        lastSeenAt: serverTimestamp(),
        userAgent: navigator.userAgent || 'unknown'
      };
    }

    return {
      deviceKey: deviceId,
      firstSeenAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      userAgent: navigator.userAgent || 'unknown'
    };
  }).catch(() => {
    renderUnavailable();
  });

  // Remove apenas o registro antigo deste mesmo navegador, caso ele tenha sido criado pela versão online.
  // Não apaga o novo contador permanente de dispositivos.
  const legacyUserId = getLegacyUserId();
  if (legacyUserId) {
    remove(ref(database, `${LEGACY_PRESENCE_ROOT}/${legacyUserId}`)).catch(() => {});
  }
} catch {
  renderUnavailable();
}
