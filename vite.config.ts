import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Pages builds set /<repository>/; local and optional root-hosted builds use /.
  base: process.env.DEPLOY_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
});
