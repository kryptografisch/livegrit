import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

/** Reads a color from the design tokens, so the manifest and `theme-color` follow them. */
function token(name: string): string {
  const css = readFileSync(new URL('./src/styles/tokens.css', import.meta.url), 'utf8');
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(css);
  if (!match?.[1]) throw new Error(`tokens.css: --${name} missing or not a hex color`);
  return match[1];
}

const themeColor = token('color-surface'); // the nav bar
const backgroundColor = token('color-bg'); // the splash screen

/** Replaces `%THEME_COLOR%` in index.html (must match the manifest's `theme_color`). */
function themeColorHtml(): Plugin {
  return {
    name: 'live-grit:theme-color',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%THEME_COLOR%', themeColor),
    },
  };
}

export default defineConfig({
  plugins: [
    svelte(),
    themeColorHtml(),
    VitePWA({
      // Prompt, never auto-update: a reload mid-run would lose the attempt.
      registerType: 'prompt',
      // Registered from the app via `virtual:pwa-register` (src/lib/pwa/appPwa.ts).
      injectRegister: false,
      // public/ icons are precached by `globPatterns` already (no duplicate entries).
      includeManifestIcons: false,
      manifest: {
        name: 'LiveGrit',
        short_name: 'LiveGrit',
        description: 'Simple, opinionated speedrun split timer built as a PWA. Works offline.',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: themeColor,
        background_color: backgroundColor,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,svg,png,woff2}'],
        // The livesplit-core wasm is ~1.3 MB (default limit 2 MiB); leave room to grow.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Hash routing: every navigation is index.html.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
