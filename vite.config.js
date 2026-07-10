import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.tiendanube.com',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = new URL(req.url, 'http://localhost');
            const tnpath = url.searchParams.get('tnpath');
            if (tnpath) {
              url.searchParams.delete('tnpath');
              const newPath = url.pathname + (url.search || '');
              const target = `/v1/${tnpath}${newPath}`;
              proxyReq.path = target;
            }
            if (!proxyReq.headers['Authentication']) {
              const token = url.searchParams.get('tiendanube_token') || 
                           (url.searchParams.get('Authorization') ? 
                            `Bearer ${url.searchParams.get('Authorization')}` : null);
              if (token) {
                proxyReq.headers['Authentication'] = token;
              }
            }
          });
        },
      },
      '/api/tiendanube': {
        target: 'https://api.tiendanube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tiendanube/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const token = req.headers?.['Authentication'] || 
                         req.headers?.['authentication'] || 
                         req.url?.includes('tiendanube_token=') ? 
                         `Bearer ${req.url.split('tiendanube_token=')[1].split('&')[0]}` : null;
            if (token && !proxyReq.headers['Authentication']) {
              proxyReq.headers['Authentication'] = token;
            }
          });
        },
      },
    },
  },
});
