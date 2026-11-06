# vite-plugin-pwa

[vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) is a Vite plugin that makes the
app an installable, offline-capable PWA. At build time it generates the web app manifest and a
service worker (via [Workbox](https://developer.chrome.com/docs/workbox) `generateSW`) that
precaches the built assets. At runtime, `virtual:pwa-register` registers the worker and reports
when a new version is waiting.

How LiveGrit uses it (version pinned in `package.json`):

- config: `VitePWA({...})` in `vite.config.ts` (manifest, icons, Workbox precache patterns)
- `registerType: 'prompt'`: an update is never applied on its own, because a reload mid-run
  would lose the attempt
- `injectRegister: false`: the app registers the worker itself (`src/lib/pwa/`), and the update
  flow lives in `src/lib/pwa/pwaUpdate.svelte.ts`

## Docs (online)

Site: https://vite-pwa-org.netlify.app/ (source: https://github.com/vite-pwa/docs)

- [Getting started](https://vite-pwa-org.netlify.app/guide/)
- [PWA minimal requirements](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements)
- [Register service worker](https://vite-pwa-org.netlify.app/guide/register-service-worker)
- [Prompt for update](https://vite-pwa-org.netlify.app/guide/prompt-for-update)
- [Service worker precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache)
- [Static assets handling](https://vite-pwa-org.netlify.app/guide/static-assets)
- [Development](https://vite-pwa-org.netlify.app/guide/development)
- [Testing service worker](https://vite-pwa-org.netlify.app/guide/testing-service-worker)
- [Frameworks](https://vite-pwa-org.netlify.app/frameworks/) and
  [Svelte](https://vite-pwa-org.netlify.app/frameworks/svelte)
- [Workbox `generateSW`](https://vite-pwa-org.netlify.app/workbox/generate-sw)
