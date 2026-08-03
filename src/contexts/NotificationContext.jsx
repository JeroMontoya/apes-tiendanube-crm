import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getUpcomingEvents } from '../utils/colombianEvents';

const NotificationContext = createContext(null);

let _nextId = 1;

// Sound configuration
const NOTIFICATION_SOUNDS = {
  urgent: '/sounds/urgent.mp3',
  warning: '/sounds/warning.mp3',
  info: '/sounds/info.mp3',
};

let audioContext = null;
let soundEnabled = true;

function playNotificationSound(urgency = 'info') {
  if (!soundEnabled) return;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const t = audioContext.currentTime;
    
    // Modern UI Sound Design: Softer attack, organic decay, subtle frequencies
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Choose waveforms that sound smoother
    oscillator.type = 'sine';
    
    let freqs, duration;
    
    if (urgency === 'urgent') {
      freqs = [880, 1108.73]; // A5 -> C#6 (alert)
      duration = 0.4;
      oscillator.type = 'triangle';
    } else if (urgency === 'warning') {
      freqs = [659.25, 523.25]; // E5 -> C5 (descending warning)
      duration = 0.3;
    } else {
      // Info: Modern "Pop/Marimba" (Ascending C5 -> E5)
      freqs = [523.25, 659.25];
      duration = 0.25;
    }
    
    // Pitch envelope
    oscillator.frequency.setValueAtTime(freqs[0], t);
    if (freqs[1]) {
      oscillator.frequency.exponentialRampToValueAtTime(freqs[1], t + 0.08);
    }
    
    // Amplitude envelope (fast attack, exponential release for "pop" feel)
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.15, t + 0.02); // Quick fade in to avoid clicks
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration); // Smooth release
    
    oscillator.start(t);
    oscillator.stop(t + duration);
  } catch (e) {
    // Silently fail if audio context is not available
  }
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
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
            details: ev.details || null,
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

  const addNotification = useCallback(({ type, title, message, icon, data, emoji, urgency, calendarId, details }) => {
    const id = _nextId++;
    const notif = { id, type, title, message, icon: icon || null, emoji: emoji || null, urgency: urgency || null, calendarId: calendarId || null, data: data || null, read: false, timestamp: Date.now(), details: details || null };
    setNotifications(prev => [notif, ...prev].slice(0, 100));
    
    // Play sound for new notifications
    if (urgency === 'urgent' || urgency === 'warning') {
      playNotificationSound(urgency);
    }
    
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

  const notify = useCallback(({ type, title, message, icon, data, toast = true, emoji, urgency, calendarId, details }) => {
    const id = addNotification({ type, title, message, icon, data, emoji, urgency, calendarId, details });
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

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const setSoundEnabled = useCallback((enabled) => {
    soundEnabled = enabled;
    localStorage.setItem('notification_sound_enabled', JSON.stringify(enabled));
  }, []);

  const isSoundEnabled = useCallback(() => {
    return soundEnabled;
  }, []);

  // Load sound preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification_sound_enabled');
    if (saved !== null) {
      soundEnabled = JSON.parse(saved);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, toasts, unreadCount, expandedId,
      addNotification, addToast, notify,
      markAsRead, markAllRead, dismissCalendar, clearNotification, clearAll,
      dismissToast, toggleExpand, setSoundEnabled, isSoundEnabled,
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
