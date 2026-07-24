/**
 * /api/whatsapp/hot-leads.js
 * GET /api/whatsapp/hot-leads — List hot leads with stats
 * PATCH /api/whatsapp/hot-leads/:id — Update lead status
 *
 * Hot Leads are created automatically by the inbound webhook
 * when a customer replies with an objection or purchase intent.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET — List leads
    if (req.method === 'GET') {
      const { status, type, limit = 50, offset = 0 } = req.query;

      let query = supabase
        .from('whatsapp_hot_leads')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (status && status !== 'all') query = query.eq('status', status);
      if (type) query = query.eq('objection_type', type);

      const { data: leads, error } = await query;
      if (error) throw error;

      // Get stats
      const { data: statsData } = await supabase
        .from('whatsapp_hot_leads')
        .select('objection_type, status, priority, cart_total')
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

      const stats = {
        total: statsData?.length || 0,
        by_status: {},
        by_type: {},
        total_cart_value: 0,
        urgent: 0,
      };

      for (const lead of statsData || []) {
        stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1;
        stats.by_type[lead.objection_type] = (stats.by_type[lead.objection_type] || 0) + 1;
        stats.total_cart_value += lead.cart_total || 0;
        if (lead.priority === 1) stats.urgent++;
      }

      return res.status(200).json({ leads: leads || [], stats });
    }

    // PATCH — Update lead status
    if (req.method === 'PATCH') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'Lead ID required' });

      const { status, notes, assigned_to } = req.body || {};
      const update = { updated_at: new Date().toISOString() };
      if (status) {
        update.status = status;
        if (status === 'CONTACTED') update.contacted_at = new Date().toISOString();
        if (status === 'CONVERTED') update.converted_at = new Date().toISOString();
        if (status === 'CLOSED') update.closed_at = new Date().toISOString();
      }
      if (notes) update.notes = notes;
      if (assigned_to) update.assigned_to = assigned_to;

      const { data, error } = await supabase
        .from('whatsapp_hot_leads')
        .update(update)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ lead: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[HOT LEADS ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
