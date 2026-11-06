// Minimal hash router (routes in `routes.ts`). Hash routing needs no server config and
// works for an offline PWA.

import { parseHash, type AppLocation } from './routes';

export const router = $state<AppLocation>(parseHash(location.hash));

window.addEventListener('hashchange', () => {
  const next = parseHash(location.hash);
  router.route = next.route;
  router.section = next.section;
});
