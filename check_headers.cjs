const https = require('https');

https.get('https://apes-tiendanube-crm.vercel.app', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
