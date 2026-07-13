import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const SSE_URL = '/api/sync/stream';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT = 10;

export function useRealtimeSync({ onConfigChange, onOrderChange, onProductChange, onBroadcast }) {
  const eventSourceRef = useRef(null);
  const reconnectCount = useRef(0);
  const broadcastChannelRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  // Use refs to avoid stale closures and reconnect loops
  const callbacksRef = useRef({ onConfigChange, onOrderChange, onProductChange, onBroadcast });
  callbacksRef.current = { onConfigChange, onOrderChange, onProductChange, onBroadcast };

  // SSE connection
  useEffect(() => {
    let alive = true;

    function connect() {
      if (!alive) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const es = new EventSource(SSE_URL + '?channel=global');
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!alive) return;
          setConnected(true);
          reconnectCount.current = 0;
        };

        es.onmessage = (event) => {
          if (!alive) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') return; // Initial handshake
            setLastEvent(data);
            const cbs = callbacksRef.current;
            if (data.type === 'config-changed' && cbs.onConfigChange) cbs.onConfigChange(data);
            if (data.type === 'order-changed' && cbs.onOrderChange) cbs.onOrderChange(data);
            if (data.type === 'product-changed' && cbs.onProductChange) cbs.onProductChange(data);
            if ((data.type === 'db-change' || data.type === 'tn-event' || data.type === 'workspace-changed') && cbs.onBroadcast) cbs.onBroadcast(data);
          } catch (err) {
            console.warn('[SSE] Parse error:', err);
          }
        };

        es.onerror = () => {
          if (!alive) return;
          setConnected(false);
          es.close();
          eventSourceRef.current = null;

          if (reconnectCount.current < MAX_RECONNECT) {
            reconnectCount.current++;
            const delay = RECONNECT_DELAY * Math.min(reconnectCount.current, 5);
            setTimeout(connect, delay);
          }
        };
      } catch (err) {
        console.warn('[SSE] Connection failed:', err);
      }
    }

    connect();

    return () => {
      alive = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []); // Empty deps - only connect once

  // Supabase Broadcast channel for cross-tab/cross-device sync (FREE tier)
  // NOTE: postgres_changes requires Pro plan - we only use Broadcast
  useEffect(() => {
    let alive = true;

    try {
      const channel = supabase.channel('cross-tab-sync');

      channel
        .on('broadcast', { event: 'data-changed' }, (payload) => {
          if (!alive) return;
          const data = payload.payload;
          setLastEvent({ type: 'broadcast', ...data });
          const cbs = callbacksRef.current;
          if (cbs.onBroadcast) cbs.onBroadcast(data);
        })
        .on('broadcast', { event: 'config-changed' }, (payload) => {
          if (!alive) return;
          setLastEvent({ type: 'broadcast-config', ...payload.payload });
          const cbs = callbacksRef.current;
          if (cbs.onConfigChange) cbs.onConfigChange(payload.payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Broadcast] Subscribed to cross-tab-sync');
          }
        });

      broadcastChannelRef.current = channel;
    } catch (err) {
      console.warn('[Broadcast] Subscription failed:', err);
    }

    return () => {
      alive = false;
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
    };
  }, []); // Empty deps - only subscribe once

  // Broadcast function to send events to other tabs/devices
  const broadcast = async (event, payload) => {
    if (broadcastChannelRef.current) {
      await broadcastChannelRef.current.send({
        type: 'broadcast',
        event: event,
        payload: payload,
      });
    }
  };

  return { connected, lastEvent, broadcast };
}
