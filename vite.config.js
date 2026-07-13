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
            try {
              const url = new URL(req.url, 'http://localhost');
              
              // Handle both formats:
              // 1. /api/tn-proxy?tnpath=storeId/path&params (old format)
              // 2. /api/tn-proxy/storeId/path?params (new format)
              let tnpath = url.searchParams.get('tnpath');
              if (!tnpath) {
                // Extract from pathname: /api/tn-proxy/storeId/path -> storeId/path
                const prefix = '/api/tn-proxy/';
                if (url.pathname.startsWith(prefix)) {
                  tnpath = url.pathname.slice(prefix.length);
                }
              }
              
              if (tnpath) {
                url.searchParams.delete('tnpath');
                const newPath = url.search || '';
                const target = `/v1/${tnpath}${newPath ? `?${newPath.slice(1)}` : ''}`;
                proxyReq.path = target;
              }
              
              const existingAuth = proxyReq.getHeader?.('Authentication') ?? proxyReq.headers?.['Authentication'];
              if (!existingAuth) {
                const token = url.searchParams.get('tiendanube_token') || 
                             (url.searchParams.get('Authorization') ? 
                              `Bearer ${url.searchParams.get('Authorization')}` : null);
                if (token) {
                  if (proxyReq.setHeader) {
                    proxyReq.setHeader('Authentication', token);
                  } else if (proxyReq.headers) {
                    proxyReq.headers['Authentication'] = token;
                  }
                }
              }
            } catch (e) {
              console.warn('[Vite Proxy] Error in proxyReq handler:', e.message);
            }
          });
        },
      },
      '/gapi-content': {
        target: 'https://shoppingcontent.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gapi-content/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers?.['authorization'];
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        },
      },
      '/gapi-analytics': {
        target: 'https://analyticsdata.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gapi-analytics/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers?.['authorization'];
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        },
      },
      '/gapi-oauth': {
        target: 'https://oauth2.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gapi-oauth/, ''),
      },
      '/gapi-webmasters': {
        target: 'https://www.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gapi-webmasters/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers?.['authorization'];
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        },
      },
      '/gapi-ads': {
        target: 'https://googleads.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gapi-ads/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers?.['authorization'];
            if (auth) proxyReq.setHeader('Authorization', auth);
            const devToken = req.headers?.['developer-token'];
            if (devToken) proxyReq.setHeader('developer-token', devToken);
          });
        },
      },
      '/api/tiendanube': {
        target: 'https://api.tiendanube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tiendanube/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            try {
              const reqAuth = req.headers?.['Authentication'] || req.headers?.['authentication'];
              const urlToken = req.url?.includes('tiendanube_token=') ? 
                              `Bearer ${req.url.split('tiendanube_token=')[1].split('&')[0]}` : null;
              const token = reqAuth || urlToken;
              const existingAuth = proxyReq.getHeader?.('Authentication') ?? proxyReq.headers?.['Authentication'];
              if (token && !existingAuth) {
                if (proxyReq.setHeader) {
                  proxyReq.setHeader('Authentication', token);
                } else if (proxyReq.headers) {
                  proxyReq.headers['Authentication'] = token;
                }
              }
            } catch (e) {
              console.warn('[Vite Proxy] Error in tiendanube proxy handler:', e.message);
            }
          });
        },
      },
    },
  },
  css: {
    // Disable CSS inlining to avoid parsing issues with complex CSS
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    // Disable CSS code splitting to avoid inlining issues
    cssCodeSplit: false,
    // Disable CSS minification to avoid parsing issues
    cssMinify: false,
  },
});
