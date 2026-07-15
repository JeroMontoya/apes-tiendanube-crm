import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

let _nextId = 1;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const addNotification = useCallback(({ type, title, message, icon, data }) => {
    const id = _nextId++;
    const notif = { id, type, title, message, icon: icon || null, data: data || null, read: false, timestamp: Date.now() };
    setNotifications(prev => [notif, ...prev].slice(0, 100));
    return id;
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000, icon }) => {
    const id = _nextId++;
    const toast = { id, type, title, message, icon: icon || null, duration, exiting: false };
    setToasts(prev => [...prev, toast].slice(-5));

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
          delete timersRef.current[id];
        }, 300);
      }, duration);
    }
    return id;
  }, []);

  const notify = useCallback(({ type, title, message, icon, data, toast = true }) => {
    const id = addNotification({ type, title, message, icon, data });
    if (toast) {
      addToast({ type, title, message, icon });
    }
    return id;
  }, [addNotification, addToast]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, toasts, unreadCount,
      addNotification, addToast, notify,
      markAsRead, markAllRead, clearNotification, clearAll,
      dismissToast,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
