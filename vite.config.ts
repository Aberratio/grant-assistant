import { defineConfig } from 'vite';

// base './' keeps every asset path relative, so the static build works from any
// sub-path and inside an iframe on the kokot.it case-study page.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
  },
});
