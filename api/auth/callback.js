export default async function handler(req, res) {
  const { code, state: storeId } = req.query;

  if (!code) {
    return res.status(400).send('No se recibió el código de autorización');
  }

  try {
    const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.TN_CLIENT_ID,
        client_secret: process.env.TN_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error obteniendo token:', data);
      return res.status(500).send('Error obteniendo token de acceso');
    }

    const finalStoreId = data.store_id || storeId;
    const accessToken = data.access_token;

    // Mostrar el token en pantalla para que el usuario lo copie manualmente
    const html = `
      <html>
        <head>
          <title>¡Conexión Exitosa!</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0F1419; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1E2329; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); text-align: center; max-width: 500px; }
            h1 { color: #2D8B4E; margin-top: 0; }
            .token-box { background: #000; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; margin: 20px 0; border: 1px solid #333; color: #4CAF50; }
            p { line-height: 1.5; color: #ccc; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>¡Conexión Exitosa!</h1>
            <p>TiendaNube ha generado un nuevo <strong>Access Token</strong> para tu CRM.</p>
            <p>Por favor, copia el siguiente Token y pégalo en la pestaña "Configuración" del CRM:</p>
            
            <div class="token-box">${accessToken}</div>
            
            <p style="font-size: 12px;">Store ID: ${finalStoreId}</p>
            
            <p>Una vez que lo pegues y guardes, el CRM funcionará perfectamente.</p>
          </div>
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error OAuth callback:', error);
    res.status(500).send('Error interno del servidor: ' + error.message);
  }
}
