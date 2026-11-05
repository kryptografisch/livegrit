// Minimal hash router: `#/` = Timer, `#/controls` = Controls.
// Hash routing needs no server config and works for an offline PWA.

export type Route = 'timer' | 'controls';

const routes: Record<string, Route> = {
  '': 'timer',
  '/': 'timer',
  '/controls': 'controls',
};

function parse(hash: string): Route {
  return routes[hash.replace(/^#/, '')] ?? 'timer';
}

export const router = $state({ route: parse(location.hash) });

window.addEventListener('hashchange', () => {
  router.route = parse(location.hash);
});
