import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Nunca embutir arquivos como data: URI. Assim a CSP (firebase.json) pode exigir
    // que fontes e imagens venham só do próprio site ('self').
    assetsInlineLimit: 0,
  },
});
