import localforage from 'localforage';

localforage.config({
  name: 'ApesCRM',
  storeName: 'crm_cache'
});

const getWorkspaceKey = (key) => {
  const wsId = localStorage.getItem('onyx_active_workspace') || 'main';
  return `${wsId}_${key}`;
};

export const saveToCache = async (key, data) => {
  try {
    const wsKey = getWorkspaceKey(key);
    await localforage.setItem(wsKey, data);
    return true;
  } catch (err) {
    console.error('Error guardando en caché:', err);
    return false;
  }
};

export const loadFromCache = async (key) => {
  try {
    const wsKey = getWorkspaceKey(key);
    const value = await localforage.getItem(wsKey);
    return value;
  } catch (err) {
    console.error('Error leyendo de caché:', err);
    return null;
  }
};

export const clearCache = async () => {
  try {
    // Instead of clear() which wipes all workspaces, iterate and remove only keys for active workspace
    const wsId = localStorage.getItem('onyx_active_workspace') || 'main';
    const prefix = `${wsId}_`;
    const keys = await localforage.keys();
    const toRemove = keys.filter(k => k.startsWith(prefix));
    await Promise.all(toRemove.map(k => localforage.removeItem(k)));
  } catch (err) {
    console.error('Error limpiando caché:', err);
  }
};

export const clearStaleCache = async () => {
  try {
    const wsKeyProducts = getWorkspaceKey('tiendanube_products');
    const wsKeySync = getWorkspaceKey('last_sync');
    await localforage.removeItem(wsKeyProducts);
    await localforage.removeItem(wsKeySync);
  } catch (err) {
    console.error('Error limpiando caché stale:', err);
  }
};

