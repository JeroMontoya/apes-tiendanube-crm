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

async function analyzeImageWithVision(imageBase64, prompt) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [
        {
          role: 'system',
          content: `Sos un asistente de inventario para una tienda de ropa. Analizá imágenes de productos y extraé:
- Nombre/descripción del producto
- Categoría (remera, campera, pantalón, etc.)
- Color predominante
- Talla visible (si hay)
- Estado (nuevo, usado, dañado)
- Marca (si se ve)
- Cualquier código o número visible

Respondé SIEMPRE en JSON válido con esta estructura:
{
  "name": "descripción del producto",
  "category": "categoría",
  "color": "color",
  "size": "talla o null",
  "condition": "nuevo/usado/dañado",
  "brand": "marca o null",
  "codes": ["códigos encontrados"],
  "confidence": 0.85,
  "notes": "observaciones adicionales"
}`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Identificá este producto de inventario. Extraé nombre, categoría, color, talla, estado y cualquier código visible.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vision API error: ${err}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Fall through to return raw text
  }

  return {
    name: content,
    category: null,
    color: null,
    size: null,
    condition: null,
    brand: null,
    codes: [],
    confidence: 0.5,
    notes: content,
  };
}

async function matchProductWithIdentifier(visionData, products) {
  if (!products || products.length === 0) return null;

  const searchText = [visionData.name, visionData.brand, visionData.category, visionData.color]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const p of products) {
    const productText = [p.name, p.brand, p.category, p.color, p.sku]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const searchWords = searchText.split(/\s+/).filter(w => w.length > 2);
    let matches = 0;
    for (const word of searchWords) {
      if (productText.includes(word)) matches++;
    }

    const score = searchWords.length > 0 ? matches / searchWords.length : 0;
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = { ...p, matchScore: score };
    }
  }

  return bestMatch;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!NVIDIA_API_KEY) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY no configurada' });
  }

  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const { image, prompt, matchAgainstCatalog = true } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Imagen requerida (base64)' });
    }

    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    const visionData = await analyzeImageWithVision(base64Data, prompt);

    let matchedProduct = null;
    if (matchAgainstCatalog) {
      const { data: products } = await supabaseAdmin
        .from('inventory_products')
        .select('id, name, sku, category, color, size, barcode, image_url');

      matchedProduct = await matchProductWithIdentifier(visionData, products);
    }

    return res.status(200).json({
      success: true,
      data: {
        vision: visionData,
        matchedProduct,
        hasMatch: !!matchedProduct,
      },
    });
  } catch (err) {
    console.error('AI Vision error:', err);
    return res.status(500).json({ error: err.message });
  }
}
