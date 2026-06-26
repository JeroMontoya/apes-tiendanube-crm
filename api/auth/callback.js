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

    // Redirigir al CRM con los datos en la URL (se guardarán en localStorage)
    res.redirect(`/?installed=true&store=${finalStoreId}&token=${accessToken}`);
  } catch (error) {
    console.error('Error OAuth callback:', error);
    res.status(500).send('Error interno del servidor');
  }
}
