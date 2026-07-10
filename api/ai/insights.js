import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with Vercel Environment Variable
const apiKey = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada.' });
  }

  try {
    const { clientsData, storeMetrics } = req.body;
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Eres el Director de Marketing (CMO) de un e-commerce. 
      Analiza los siguientes datos y proporciona:
      1. Un análisis breve y estratégico (2 párrafos) del estado del e-commerce.
      2. 3 Sugerencias de acción inmediatas para mejorar la rentabilidad o retención.
      3. Un texto (copy) para un correo de recuperación de carritos abandonados.
      4. Un texto (copy) corto para WhatsApp dirigido a clientes VIP.

      Datos del E-commerce:
      Ventas Totales Estimadas: $${storeMetrics?.totalRevenue}
      Clientes Totales: ${storeMetrics?.totalClients}
      
      Distribución de Etiquetas de Segmento:
      ${JSON.stringify(clientsData?.tagDistribution, null, 2)}
      
      Por favor, formatea la respuesta en formato JSON con la siguiente estructura:
      {
        "analisis": "texto",
        "sugerencias": ["sug 1", "sug 2", "sug 3"],
        "copyEmailAbandonado": "Asunto: ...\n\nCuerpo...",
        "copyWhatsAppVIP": "texto para whatsapp"
      }
      Solo devuelve el JSON, sin formato markdown (\`\`\`json).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown JSON wrapping
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response:", text);
      return res.status(500).json({ error: 'Error parseando la respuesta de la IA' });
    }

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ error: 'Error procesando la solicitud a Gemini' });
  }
}
