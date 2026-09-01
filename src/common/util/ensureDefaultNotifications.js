import fetchOrThrow from './fetchOrThrow';

const REQUIRED_NOTIFICATIONS = [
  { type: 'ignitionOn', description: 'Ignição Ligada', notificators: 'web,firebase', always: false },
  { type: 'ignitionOff', description: 'Ignição Desligada', notificators: 'web,firebase', always: false },
];

export const ensureDefaultNotifications = async () => {
  try {
    const response = await fetchOrThrow('/api/notifications');
    const existing = await response.json();

    for (const req of REQUIRED_NOTIFICATIONS) {
      const alreadyExists = existing.some((item) => item.type === req.type);
      if (!alreadyExists) {
        await fetchOrThrow('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        }).catch(() => {});
      }
    }
  } catch (error) {
    // Silencia erros se não for admin ou se a API falhar
  }
};