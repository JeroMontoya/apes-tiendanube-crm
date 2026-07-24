export default function handler(req, res) {
  // Capturar parámetros tanto de GET como de POST
  const params = { ...req.query, ...(req.body || {}) };
  const queryString = new URLSearchParams(params).toString();
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Devolver un 200 OK para que TiendaNube no muestre el error de "No fue posible cargar"
  // y usar HTML/JS para redirigir la página internamente a la app React por GET.
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0; url=/?${queryString}">
        <style>
          body { background-color: #0F1419; color: #F5F0EB; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        </style>
      </head>
      <body>
        <h2>Cargando Onyx Core...</h2>
        <script>
          window.location.href = '/?' + '${queryString}';
        </script>
      </body>
    </html>
  `);
}
