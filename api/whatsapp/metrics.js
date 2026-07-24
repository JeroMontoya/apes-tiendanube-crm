/**
 * /api/whatsapp/metrics.js
 * Métricas de envíos WhatsApp — stats de envíos, respuestas, conversión
 * GET /api/whatsapp/metrics — Métricas generales
 * GET /api/whatsapp/metrics?category=abandoned_cart — Filtrar por categoría
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { category, days = 30 } = req.query;
    const sinceDate = new Date(Date.now() - parseInt(days) * 86400000).toISOString();

    let query = supabase
      .from('whatsapp_messages_log')
      .select('*')
      .gte('sent_at', sinceDate)
      .order('sent_at', { ascending: false });

    if (category) query = query.eq('category', category);

    const { data: messages, error } = await query;
    if (error) throw error;

    const total = messages?.length || 0;
    const sent = messages?.filter(m => m.status === 'sent').length || 0;
    const failed = messages?.filter(m => m.status === 'failed').length || 0;
    const byCategory = {};

    for (const msg of messages || []) {
      const cat = msg.category || 'general';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, sent: 0, failed: 0 };
      byCategory[cat].total++;
      if (msg.status === 'sent') byCategory[cat].sent++;
      if (msg.status === 'failed') byCategory[cat].failed++;
    }

    // Activity by day
    const byDay = {};
    for (const msg of messages || []) {
      const day = msg.sent_at?.substring(0, 10);
      if (!day) continue;
      if (!byDay[day]) byDay[day] = { sent: 0, failed: 0 };
      if (msg.status === 'sent') byDay[day].sent++;
      if (msg.status === 'failed') byDay[day].failed++;
    }

    const whatsappConfigured = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

    return res.status(200).json({
      summary: {
        total_messages: total,
        sent,
        failed,
        success_rate: total > 0 ? ((sent / total) * 100).toFixed(1) : '0',
        period_days: parseInt(days),
      },
      by_category: byCategory,
      activity_by_day: byDay,
      recent_messages: (messages || []).slice(0, 20),
      whatsapp_configured: whatsappConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WHATSAPP METRICS ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
