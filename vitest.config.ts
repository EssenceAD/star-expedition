import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] }, define: { __APP_VERSION__: '"test"', __BUILD__: '"test"' } });
