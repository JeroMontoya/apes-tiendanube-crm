import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function useInventoryRealtime({ onStockChange, onMovementChange, onAlertChange, onSyncEvent } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const mountedRef = useRef(true);
  const channelsRef = useRef([]);
  const reconnectRef = useRef(0);
  const callbacksRef = useRef({ onStockChange, onMovementChange, onAlertChange, onSyncEvent });

  useEffect(() => {
    callbacksRef.current = { onStockChange, onMovementChange, onAlertChange, onSyncEvent };
  }, [onStockChange, onMovementChange, onAlertChange, onSyncEvent]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cleanup = useCallback(() => {
    channelsRef.current.forEach((ch) => {
      try { supabase.removeChannel(ch); } catch (_) {}
    });
    channelsRef.current = [];
    if (mountedRef.current) setConnected(false);
  }, []);

  const connect = useCallback(() => {
    cleanup();
    reconnectRef.current = 0;

    const stockChannel = supabase
      .channel('inv-stock-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_stock' }, (payload) => {
        if (!mountedRef.current) return;
        const ev = { type: 'stock', event: payload.eventType, data: payload.new, old: payload.old, timestamp: new Date().toISOString() };
        setLastEvent(ev);
        callbacksRef.current.onStockChange?.(ev);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_movements' }, (payload) => {
        if (!mountedRef.current) return;
        const ev = { type: 'movement', event: payload.eventType, data: payload.new, timestamp: new Date().toISOString() };
        setLastEvent(ev);
        callbacksRef.current.onMovementChange?.(ev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_alerts' }, (payload) => {
        if (!mountedRef.current) return;
        const ev = { type: 'alert', event: payload.eventType, data: payload.new, old: payload.old, timestamp: new Date().toISOString() };
        setLastEvent(ev);
        callbacksRef.current.onAlertChange?.(ev);
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          reconnectRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
          reconnectRef.current += 1;
          const delay = Math.min(1000 * 2 ** reconnectRef.current, 30000);
          setTimeout(() => {
            if (mountedRef.current) connect();
          }, delay);
        }
      });

    const syncChannel = supabase
      .channel('inv-sync-realtime')
      .on('broadcast', { event: 'tiendanube_sync' }, (payload) => {
        if (!mountedRef.current) return;
        const ev = { type: 'sync', event: 'tiendanube_sync', data: payload.payload, timestamp: new Date().toISOString() };
        setLastEvent(ev);
        callbacksRef.current.onSyncEvent?.(ev);
      })
      .subscribe();

    channelsRef.current = [stockChannel, syncChannel];
  }, [cleanup]);

  useEffect(() => {
    connect();
    return () => cleanup();
  }, []);

  return { connected, lastEvent };
}
