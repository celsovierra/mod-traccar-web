const STORAGE_KEY = 'smsmarket_credentials';
let currentUser = null;

async function loadFromTraccar() {
  try {
    const r = await fetch('/api/session', { credentials: 'include' });
    if (!r.ok) return;
    currentUser = await r.json();
    const remote = currentUser.attributes && currentUser.attributes[STORAGE_KEY];
    if (remote) localStorage.setItem(STORAGE_KEY, remote);
  } catch (e) { console.warn('smsmarket sync: falha ao ler sessao', e); }
}

async function saveToTraccar(value) {
  if (!currentUser || !currentUser.id) return;
  try {
    const body = { ...currentUser, attributes: { ...(currentUser.attributes || {}), [STORAGE_KEY]: value } };
    const r = await fetch('/api/users/' + currentUser.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (r.ok) currentUser = body;
  } catch (e) { console.warn('smsmarket sync: falha ao salvar', e); }
}

const original = localStorage.setItem.bind(localStorage);
localStorage.setItem = (k, v) => { original(k, v); if (k === STORAGE_KEY) saveToTraccar(v); };

loadFromTraccar();