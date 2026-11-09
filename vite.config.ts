import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const cnePlanProxy = {
  '/cne-plan': {
    target: 'https://backend-apps.cne.gob.ec',
    changeOrigin: true,
    secure: false,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/pdf,application/octet-stream,*/*',
    },
    rewrite: (path: string) => path.replace(/^\/cne-plan/, '/vi/api/Catalogos/PlanTrabajo'),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: cnePlanProxy,
  },
  preview: {
    host: true,
    proxy: cnePlanProxy,
  },
});
