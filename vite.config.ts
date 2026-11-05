import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    // livesplit-core's wasm uses modern features (bulk memory, reference types, ...),
    // so we only target current browsers anyway.
    target: 'es2022',
  },
  optimizeDeps: {
    // Don't pre-bundle livesplit-core: its glue loads the wasm via
    // `new URL('livesplit_core_bg.wasm', import.meta.url)`, which must stay next to the file.
    exclude: ['livesplit-core'],
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
});
