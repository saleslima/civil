import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js';
import {
  getDatabase,
  ref,
  onValue,
  onDisconnect,
  set
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDd3vBArUAfyofoNv7PjmSgr-OUl3r9xns',
  authDomain: 'civiloff.firebaseapp.com',
  databaseURL: 'https://civiloff-default-rtdb.firebaseio.com',
  projectId: 'civiloff',
  storageBucket: 'civiloff.firebasestorage.app',
  messagingSenderId: '790025176243',
  appId: '1:790025176243:web:53845941768a7f501f1cc6',
  measurementId: 'G-3G5RG8KK6E'
};

const USER_ID_KEY = 'civilOffFirebaseUserId:v1';
const PRESENCE_ROOT = 'presence/civiloff/onlineUsers';

const userCountElement = document.querySelector('#userCount');
const userCounterElement = userCountElement?.closest('.user-counter');

function safeRandomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${randomPart}`;
}

function loadOrCreateUserId() {
  try {
    const saved = localStorage.getItem(USER_ID_KEY);
    if (/^[a-zA-Z0-9_-]+$/.test(saved || '')) return saved;

    const created = `user_${safeRandomId().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    localStorage.setItem(USER_ID_KEY, created);
    return created;
  } catch {
    return `session_${safeRandomId().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }
}

function renderCount(value, status = 'online') {
  if (!userCountElement) return;

  const numericValue = Number(value);
  const count = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
  userCountElement.textContent = String(count);

  if (!userCounterElement) return;
  userCounterElement.dataset.presenceStatus = status;
  userCounterElement.setAttribute(
    'aria-label',
    `${count} ${count === 1 ? 'usuário online agora' : 'usuários online agora'}`
  );
  userCounterElement.setAttribute(
    'title',
    `${count} ${count === 1 ? 'usuário online agora' : 'usuários online agora'}`
  );
}

function renderUnavailable() {
  if (!userCountElement) return;
  userCountElement.textContent = '—';
  if (!userCounterElement) return;
  userCounterElement.dataset.presenceStatus = 'offline';
  userCounterElement.setAttribute('aria-label', 'Contador online indisponível');
  userCounterElement.setAttribute('title', 'Contador online indisponível. Verifique a conexão ou as regras do Firebase.');
}

function countDirectChildren(snapshot) {
  let total = 0;
  snapshot.forEach(() => {
    total += 1;
  });
  return total;
}

const app = initializeApp(firebaseConfig);

isAnalyticsSupported()
  .then((supported) => {
    if (supported) getAnalytics(app);
  })
  .catch(() => {
    // Analytics não é obrigatório para o contador funcionar.
  });

try {
  const database = getDatabase(app);
  const userId = loadOrCreateUserId();
  const connectionId = `conn_${safeRandomId().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const onlineUsersRef = ref(database, PRESENCE_ROOT);
  const connectedRef = ref(database, '.info/connected');
  const currentConnectionRef = ref(database, `${PRESENCE_ROOT}/${userId}/${connectionId}`);

  onValue(onlineUsersRef, (snapshot) => {
    renderCount(countDirectChildren(snapshot));
  }, () => {
    renderUnavailable();
  });

  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() !== true) {
      if (userCounterElement) userCounterElement.dataset.presenceStatus = 'offline';
      return;
    }

    onDisconnect(currentConnectionRef)
      .remove()
      .then(() => set(currentConnectionRef, true))
      .catch(() => renderUnavailable());
  }, () => {
    renderUnavailable();
  });

  window.addEventListener('pagehide', () => {
    set(currentConnectionRef, null).catch(() => {});
  });
} catch {
  renderUnavailable();
}
