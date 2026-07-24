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

async function extractTextFromOCR(imageBase64) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/ocr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      input: [
        {
          type: 'image_url',
          url: `data:image/png;base64,${imageBase64}`,
        },
      ],
      merge_levels: ['paragraph'],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OCR API error: ${err}`);
  }

  return response.json();
}

function parseRemitoText(ocrResult) {
  const allText = [];
  if (ocrResult?.data) {
    for (const item of ocrResult.data) {
      if (item.text_detections) {
        for (const det of item.text_detections) {
          if (det.text_prediction?.text) {
            allText.push(det.text_prediction.text);
          }
        }
      }
    }
  }

  const fullText = allText.join('\n');

  const items = [];
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const qtyMatch = line.match(/(\d+)\s*(?:u|uds?|pcs?|unidades?|pzas?)/i);
    const skuMatch = line.match(/(?:SKU|Código|Codigo|Ref|Referencia)[:\s]*([A-Z0-9\-]+)/i);
    const barcodeMatch = line.match(/(\d{8,13})/);
    const priceMatch = line.match(/\$\s*([\d.,]+)/);

    if (qtyMatch || skuMatch || barcodeMatch) {
      items.push({
        quantity: qtyMatch ? parseInt(qtyMatch[1]) : null,
        sku: skuMatch ? skuMatch[1] : null,
        barcode: barcodeMatch ? barcodeMatch[1] : null,
        price: priceMatch ? parseFloat(priceMatch[1].replace('.', '').replace(',', '.')) : null,
        rawText: line,
      });
    }
  }

  return {
    rawText: fullText,
    lines,
    items,
    itemCount: items.length,
  };
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
    const { image, locationId } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Imagen requerida (base64)' });
    }

    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    const ocrResult = await extractTextFromOCR(base64Data);
    const parsed = parseRemitoText(ocrResult);

    const { data: products } = await supabaseAdmin
      .from('inventory_products')
      .select('id, sku, barcode, name')
      .or(`sku.in.(${parsed.items.filter(i => i.sku).map(i => `'${i.sku}'`).join(',')}),barcode.in.(${parsed.items.filter(i => i.barcode).map(i => `'${i.barcode}'`).join(',')})`);

    const matchedProducts = {};
    if (products) {
      for (const p of products) {
        if (p.sku) matchedProducts[p.sku.toUpperCase()] = p;
        if (p.barcode) matchedProducts[p.barcode] = p;
      }
    }

    const results = parsed.items.map(item => {
      const match = (item.sku && matchedProducts[item.sku.toUpperCase()]) ||
                    (item.barcode && matchedProducts[item.barcode]);
      return {
        ...item,
        matched: match || null,
        productId: match?.id || null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        rawText: parsed.rawText,
        lines: parsed.lines,
        itemCount: parsed.itemCount,
        items: results,
        matchedCount: results.filter(r => r.matched).length,
        unmatchedCount: results.filter(r => !r.matched).length,
        ocrUsage: ocrResult?.usage || null,
      },
    });
  } catch (err) {
    console.error('AI Scan error:', err);
    return res.status(500).json({ error: err.message });
  }
}
