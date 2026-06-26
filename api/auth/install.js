export default async function handler(req, res) {
  const { store_id } = req.query;

  if (!store_id) {
    return res.status(400).send('Falta store_id');
  }

  const clientId = process.env.TN_CLIENT_ID;
  const redirectUri = `https://apes-tiendanube-crm.vercel.app/api/auth/callback`;

  const authUrl = `https://www.tiendanube.com/apps/${clientId}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${store_id}`;

  res.redirect(authUrl);
}
