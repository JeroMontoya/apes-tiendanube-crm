import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeSync({ onConfigChange, onOrderChange, onProductChange, onBroadcast }) {
  const broadcastChannelRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  const callbacksRef = useRef({ onConfigChange, onOrderChange, onProductChange, onBroadcast });
  callbacksRef.current = { onConfigChange, onOrderChange, onProductChange, onBroadcast };

  useEffect(() => {
    let alive = true;

    const channel = supabase.channel('cross-tab-sync');

    channel
      .on('broadcast', { event: 'data-changed' }, (payload) => {
        if (!alive) return;
        const data = payload.payload;
        setLastEvent({ type: 'broadcast', ...data });
        const cbs = callbacksRef.current;
        if (data.type === 'config-changed' && cbs.onConfigChange) cbs.onConfigChange(data);
        if (data.type === 'order-changed' && cbs.onOrderChange) cbs.onOrderChange(data);
        if (data.type === 'product-changed' && cbs.onProductChange) cbs.onProductChange(data);
        if (cbs.onBroadcast) cbs.onBroadcast(data);
      })
      .on('broadcast', { event: 'config-changed' }, (payload) => {
        if (!alive) return;
        setLastEvent({ type: 'broadcast-config', ...payload.payload });
        const cbs = callbacksRef.current;
        if (cbs.onConfigChange) cbs.onConfigChange(payload.payload);
      })
      .subscribe((status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          console.log('[Realtime] Broadcast connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
          console.warn('[Realtime] Broadcast failed:', status);
        }
      });

    broadcastChannelRef.current = channel;

    // Periodic ping to verify connection is alive
    const pingInterval = setInterval(async () => {
      try {
        const { error } = await supabase.rpc('version');
        if (error && connected) {
          setConnected(false);
        } else if (!error) {
          setConnected(true);
        }
      } catch {
        // RPC might not exist - check with a simple query
        try {
          await supabase.from('workspaces').select('id').limit(1);
          setConnected(true);
        } catch {
          setConnected(false);
        }
      }
    }, 30000);

    return () => {
      alive = false;
      clearInterval(pingInterval);
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
    };
  }, []);

  const broadcast = useCallback(async (event, payload) => {
    if (broadcastChannelRef.current) {
      await broadcastChannelRef.current.send({
        type: 'broadcast',
        event: event,
        payload: payload,
      });
    }
  }, []);

  return { connected, lastEvent, broadcast };
}
