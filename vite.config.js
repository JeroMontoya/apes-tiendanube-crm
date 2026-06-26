import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/tiendanube': {
        target: 'https://api.tiendanube.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tiendanube/, ''),
      },
    },
  },
});
