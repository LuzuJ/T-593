import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const cnePlanProxy = {
  '/cne-plan': {
    target: 'https://backend-apps.cne.gob.ec',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/cne-plan/, '/vi/api/Catalogos/PlanTrabajo'),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: cnePlanProxy },
  preview: { proxy: cnePlanProxy },
});
