import localforage from 'localforage';

localforage.config({
  name: 'ApesCRM',
  storeName: 'crm_cache'
});

export const saveToCache = async (key, data) => {
  try {
    await localforage.setItem(key, data);
    return true;
  } catch (err) {
    console.error('Error guardando en caché:', err);
    return false;
  }
};

export const loadFromCache = async (key) => {
  try {
    const value = await localforage.getItem(key);
    return value;
  } catch (err) {
    console.error('Error leyendo de caché:', err);
    return null;
  }
};

export const clearCache = async () => {
  try {
    await localforage.clear();
  } catch (err) {
    console.error('Error limpiando caché:', err);
  }
};
