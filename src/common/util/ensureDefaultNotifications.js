import fetchOrThrow from './fetchOrThrow';

const REQUIRED_NOTIFICATIONS = [
  {
    type: 'ignitionOn',
    description: 'Igni\u00e7\u00e3o Ligada',
    notificators: 'web,firebase',
    always: true,
  },
  {
    type: 'ignitionOff',
    description: 'Igni\u00e7\u00e3o Desligada',
    notificators: 'web,firebase',
    always: true,
  },
];

let running = false;
let done = false;

export const ensureDefaultNotifications = async (user) => {
  if (running || done || !user || !user.administrator) {
    return;
  }
  running = true;
  try {
    const response = await fetchOrThrow('/api/notifications?all=true');
    const existing = await response.json();
    if (!Array.isArray(existing)) {
      return;
    }
    for (const req of REQUIRED_NOTIFICATIONS) {
      if (!existing.some((item) => item.type === req.type)) {
        await fetchOrThrow('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });
      }
    }
    done = true;
  } catch {
    // silencia erros
  } finally {
    running = false;
  }
};
