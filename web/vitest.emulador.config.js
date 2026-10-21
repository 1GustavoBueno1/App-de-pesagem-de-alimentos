import { defineConfig } from 'vitest/config';

// Testes contra os emuladores do Firebase (rode com: npm run test:emulador).
export default defineConfig({
  test: { include: ['tests-emulador/**/*.test.js'], fileParallelism: false, testTimeout: 20000 },
});
