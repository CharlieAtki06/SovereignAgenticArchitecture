import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';

const stub = (name: string): string =>
  fileURLToPath(new URL(`./tests/stubs/${name}.tsx`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@docusaurus/BrowserOnly': stub('BrowserOnly'),
      '@docusaurus/Link': stub('Link'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
