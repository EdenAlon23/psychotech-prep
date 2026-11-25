import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base './' = relative asset paths, so the same build works on GitHub Pages
// (served under /psychotech-prep/) and on Vercel (served at /).
export default defineConfig({
  base: './',
  plugins: [react()],
});
