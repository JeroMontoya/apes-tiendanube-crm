import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user;
}

async function generateEmbedding(text) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'nvidia/nemotron-3-embed-1b',
      input_type: 'query',
      encoding_format: 'float',
      truncate: 'NONE',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${err}`);
  }

  const result = await response.json();
  return result.data?.[0]?.embedding;
}

async function upsertProductEmbedding(productId, text) {
  const embedding = await generateEmbedding(text);
  if (!embedding) return null;

  const { error } = await supabaseAdmin.rpc('upsert_product_embedding', {
    p_product_id: productId,
    p_embedding: JSON.stringify(embedding),
  });

  if (error) {
    const { error: directError } = await supabaseAdmin
      .from('inventory_products')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', productId);

    if (directError) {
      console.error('Failed to store embedding:', directError);
    }
  }

  return embedding;
}

async function searchByEmbedding(queryEmbedding, limit = 20, threshold = 0.3) {
  const { data, error } = await supabaseAdmin.rpc('search_products_by_embedding', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error('Vector search error, falling back to text search:', error);
    return null;
  }

  return data;
}

export default async function handler(req, res) {
  if (!NVIDIA_API_KEY) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY no configurada' });
  }

  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const { method } = req;

  try {
    if (method === 'POST') {
      const { query, upsertProductId, upsertText } = req.body;

      if (upsertProductId && upsertText) {
        const embedding = await upsertProductEmbedding(upsertProductId, upsertText);
        return res.status(200).json({
          success: true,
          data: { productId: upsertProductId, embeddingStored: !!embedding },
        });
      }

      if (!query) {
        return res.status(400).json({ error: 'Query requerido' });
      }

      const queryEmbedding = await generateEmbedding(query);
      if (!queryEmbedding) {
        return res.status(500).json({ error: 'No se pudo generar embedding' });
      }

      const vectorResults = await searchByEmbedding(queryEmbedding);

      if (vectorResults && vectorResults.length > 0) {
        return res.status(200).json({
          success: true,
          data: {
            results: vectorResults.map(r => ({
              id: r.id,
              name: r.name,
              sku: r.sku,
              category: r.category,
              similarity: r.similarity,
              matchType: 'semantic',
            })),
            matchType: 'semantic',
            query,
          },
        });
      }

      const { data: textResults } = await supabaseAdmin
        .from('inventory_products')
        .select('id, name, sku, category')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(20);

      return res.status(200).json({
        success: true,
        data: {
          results: (textResults || []).map(r => ({
            ...r,
            similarity: 1,
            matchType: 'text',
          })),
          matchType: 'text',
          query,
        },
      });
    }

    if (method === 'GET') {
      const { data: products, error } = await supabaseAdmin
        .from('inventory_products')
        .select('id, name, sku, category, color, size, barcode')
        .order('name');

      if (error) throw error;

      const withEmbeddings = await Promise.allSettled(
        (products || []).map(async (p) => {
          const text = [p.name, p.sku, p.category, p.color, p.size].filter(Boolean).join(' ');
          const embedding = await generateEmbedding(text);
          if (embedding) {
            await supabaseAdmin
              .from('inventory_products')
              .update({ embedding: JSON.stringify(embedding) })
              .eq('id', p.id);
          }
          return { id: p.id, hasEmbedding: !!embedding };
        })
      );

      const stored = withEmbeddings.filter(r => r.status === 'fulfilled' && r.value?.hasEmbedding).length;

      return res.status(200).json({
        success: true,
        data: {
          totalProducts: products?.length || 0,
          embeddingsStored: stored,
          message: `${stored} productos indexados con embeddings`,
        },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('AI Search error:', err);
    return res.status(500).json({ error: err.message });
  }
}
