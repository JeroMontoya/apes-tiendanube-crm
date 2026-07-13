import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

const SSE_URL = '/api/sync/stream';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT = 10;

export function useRealtimeSync({ onConfigChange, onOrderChange, onProductChange, onBroadcast }) {
  const eventSourceRef = useRef(null);
  const reconnectCount = useRef(0);
  const channelRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  // SSE connection for server-pushed events
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource(SSE_URL + '?channel=global');
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        reconnectCount.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);

          if (data.type === 'config-changed' && onConfigChange) onConfigChange(data);
          if (data.type === 'order-changed' && onOrderChange) onOrderChange(data);
          if (data.type === 'product-changed' && onProductChange) onProductChange(data);
          if (data.type === 'db-change' && onBroadcast) onBroadcast(data);
          if (data.type === 'tn-event' && onBroadcast) onBroadcast(data);
        } catch (err) {
          console.warn('[SSE] Parse error:', err);
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        eventSourceRef.current = null;

        if (reconnectCount.current < MAX_RECONNECT) {
          reconnectCount.current++;
          const delay = RECONNECT_DELAY * Math.min(reconnectCount.current, 5);
          setTimeout(connectSSE, delay);
        }
      };
    } catch (err) {
      console.warn('[SSE] Connection failed:', err);
    }
  }, [onConfigChange, onOrderChange, onProductChange, onBroadcast]);

  // Supabase Realtime subscription for DB changes
  const subscribeRealtime = useCallback(() => {
    try {
      const channel = supabase
        .channel('realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_config' },
          (payload) => {
            setLastEvent({ type: 'db-change', table: 'system_config', event: payload.eventType });
            if (onConfigChange) onConfigChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workspaces' },
          (payload) => {
            setLastEvent({ type: 'db-change', table: 'workspaces', event: payload.eventType });
            if (onConfigChange) onConfigChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activity_log' },
          (payload) => {
            setLastEvent({ type: 'db-change', table: 'activity_log', event: payload.eventType });
            if (onBroadcast) onBroadcast(payload);
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch (err) {
      console.warn('[Realtime] Subscription failed:', err);
    }
  }, [onConfigChange, onBroadcast]);

  // Broadcast channel for cross-tab communication
  const broadcastChannel = useCallback(() => {
    try {
      const channel = supabase.channel('cross-tab-sync');

      channel
        .on('broadcast', { event: 'data-changed' }, (payload) => {
          setLastEvent({ type: 'broadcast', ...payload.payload });
          if (onBroadcast) onBroadcast(payload.payload);
        })
        .subscribe();

      return channel;
    } catch (err) {
      console.warn('[Broadcast] Subscription failed:', err);
      return null;
    }
  }, [onBroadcast]);

  // Send broadcast to other tabs/devices
  const broadcast = useCallback(async (event, payload) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: event,
        payload: payload,
      });
    }
  }, []);

  useEffect(() => {
    connectSSE();
    subscribeRealtime();
    const bc = broadcastChannel();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (bc) supabase.removeChannel(bc);
    };
  }, [connectSSE, subscribeRealtime, broadcastChannel]);

  return { connected, lastEvent, broadcast };
}
