import { defineConfig } from 'vitest/config';

// Testes que não precisam de emulador.
export default defineConfig({
  test: { include: ['tests/**/*.test.js'] },
});
