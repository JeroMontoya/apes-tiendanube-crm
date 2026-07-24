import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { getLatestBenchmarks, getCompetitiveIndex, getCompetitorRegistry } = await import('../../server/services/competitor-benchmark.js');

      const benchmarks = await getLatestBenchmarks(50);
      let competitiveIndex = [];
      try { competitiveIndex = await getCompetitiveIndex(); } catch {}
      const competitors = await getCompetitorRegistry();

      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      return res.status(200).json({ benchmarks, competitiveIndex, competitors });
    }

    if (req.method === 'POST') {
      const { runFullBenchmark } = await import('../../server/services/competitor-benchmark.js');
      const { products } = req.body || {};

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'products array required' });
      }

      const results = await runFullBenchmark(products);
      return res.status(200).json({ benchmarked: results.length, results });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
