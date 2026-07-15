import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getUpcomingEvents } from '../utils/colombianEvents';

const NotificationContext = createContext(null);

let _nextId = 1;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const calendarLoadedRef = useRef(false);

  // Load calendar events on mount
  useEffect(() => {
    if (calendarLoadedRef.current) return;
    calendarLoadedRef.current = true;
    try {
      const upcoming = getUpcomingEvents(30);
      const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
      const calendarNotifs = upcoming
        .filter(ev => !dismissed.includes(ev.id))
        .map(ev => {
          const urgency = ev.daysUntil <= 3 ? 'urgent' : ev.daysUntil <= 10 ? 'warning' : 'info';
          return {
            id: _nextId++,
            type: 'calendar',
            title: ev.title,
            message: ev.description || '',
            emoji: ev.emoji || '📅',
            urgency,
            daysUntil: ev.daysUntil,
            calendarId: ev.id,
            category: ev.category,
            read: false,
            timestamp: Date.now(),
          };
        });
      if (calendarNotifs.length > 0) {
        setNotifications(prev => [...calendarNotifs, ...prev]);
      }
      // Show toasts for urgent calendar events (once per session)
      const sessionKey = 'calendar_toast_' + new Date().toDateString();
      if (!sessionStorage.getItem(sessionKey)) {
        const urgent = calendarNotifs.filter(n => n.urgency === 'urgent' || n.urgency === 'warning').slice(0, 2);
        if (urgent.length > 0) {
          urgent.forEach(n => {
            addToast({ type: 'calendar', title: n.emoji + ' ' + n.title, message: n.daysUntil === 0 ? '¡Es hoy!' : `Faltan ${n.daysUntil} días`, duration: 6000 });
          });
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    } catch {}
  }, []);

  const addNotification = useCallback(({ type, title, message, icon, data, emoji, urgency, calendarId }) => {
    const id = _nextId++;
    const notif = { id, type, title, message, icon: icon || null, emoji: emoji || null, urgency: urgency || null, calendarId: calendarId || null, data: data || null, read: false, timestamp: Date.now() };
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

  const notify = useCallback(({ type, title, message, icon, data, toast = true, emoji, urgency, calendarId }) => {
    const id = addNotification({ type, title, message, icon, data, emoji, urgency, calendarId });
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

  const dismissCalendar = useCallback((calendarId) => {
    setNotifications(prev => prev.filter(n => n.calendarId !== calendarId));
    const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    dismissed.push(calendarId);
    localStorage.setItem('dismissed_notifications', JSON.stringify(dismissed));
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
      markAsRead, markAllRead, dismissCalendar, clearNotification, clearAll,
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
