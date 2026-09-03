const KEY = 'guimod_anchors';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

export const getAnchor = (deviceId) => read()[deviceId] || null;

export const getAllAnchors = () => read();

export const saveAnchor = (deviceId, anchor) => {
  const all = read();
  if (anchor) {
    all[deviceId] = anchor;
  } else {
    delete all[deviceId];
  }
  window.dispatchEvent(new Event('anchor-changed'));
  localStorage.setItem(KEY, JSON.stringify(all));
};
