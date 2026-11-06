/**
 * How to install the app in the current browser, for browsers without
 * `beforeinstallprompt` (Safari, Firefox, ...) or when Chrome hasn't offered it.
 * Detection is by user agent: only used for help text, never for features.
 */

export interface InstallHelp {
  /** Shown as "Install in <browser>". */
  browser: string;
  /** Set if this browser can't install web apps at all (shown muted, instead of steps). */
  unsupported?: string;
  /** Numbered steps; empty if `unsupported`. */
  steps: string[];
  /** Plain text after the steps (e.g. what to do instead). */
  tip?: string;
  /** Extra hint (e.g. "not possible here, use ..."). */
  note?: string;
}

export interface BrowserInfo {
  userAgent: string;
  /** iPadOS reports itself as a Mac; touch points tell them apart. */
  maxTouchPoints: number;
  /** Installing needs https or localhost. */
  secure: boolean;
}

const NOT_INSTALLED_HINT =
  'No such option? The app may already be installed: look for split-lite among your apps.';

export function installHelp({ userAgent: ua, maxTouchPoints, secure }: BrowserInfo): InstallHelp {
  const help = detect(ua, maxTouchPoints);
  if (!secure) {
    return {
      ...help,
      note: 'This page is not served over https, so browsers will not install it. Open it via https (or localhost).',
    };
  }
  return help;
}

function detect(ua: string, maxTouchPoints: number): InstallHelp {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  const android = /Android/.test(ua);

  if (ios) {
    if (/CriOS|FxiOS|EdgiOS/.test(ua)) {
      return {
        browser: 'this browser on iPhone/iPad',
        steps: [
          'Tap the Share button (Chrome and Edge: in the address bar; Firefox: in the menu ☰).',
          'Choose "Add to Home Screen" (scroll down if needed).',
          'Tap "Add". Start split-lite from the home screen icon.',
        ],
        note: 'Needs iOS 16.4 or newer. On older versions use Safari.',
      };
    }
    return {
      browser: 'Safari on iPhone/iPad',
      steps: [
        'Tap the Share button (the square with the arrow).',
        'Choose "Add to Home Screen" (scroll down if needed).',
        'Tap "Add". Start split-lite from the home screen icon.',
      ],
    };
  }

  if (android) {
    if (/SamsungBrowser/.test(ua)) {
      return {
        browser: 'Samsung Internet',
        steps: ['Open the menu ☰.', 'Choose "Add page to", then "Home screen".'],
        note: NOT_INSTALLED_HINT,
      };
    }
    if (/Firefox/.test(ua)) {
      return {
        browser: 'Firefox on Android',
        steps: ['Open the menu ⋮.', 'Choose "Add app to Home screen" (or "Install").'],
        note: NOT_INSTALLED_HINT,
      };
    }
    return {
      browser: /EdgA/.test(ua) ? 'Edge on Android' : 'Chrome on Android',
      steps: ['Open the menu ⋮.', 'Choose "Install app" (or "Add to Home screen").'],
      note: NOT_INSTALLED_HINT,
    };
  }

  if (/Firefox/.test(ua)) {
    return {
      browser: 'Firefox',
      unsupported: 'Unfortunately, Firefox does not support installing progressive web apps.',
      steps: [],
      tip: 'You can still use split-lite right here in the browser: just add it as a bookmark.',
    };
  }
  if (/Edg\//.test(ua)) {
    return {
      browser: 'Edge',
      steps: [
        'Click the install icon at the right of the address bar, or',
        'open the menu … → "Apps" → "Install split-lite".',
      ],
      note: NOT_INSTALLED_HINT,
    };
  }
  if (/OPR\//.test(ua)) {
    return {
      browser: 'Opera',
      steps: ['Click the install icon at the right of the address bar, if it shows one.'],
      note: 'If there is none, open this page in Chrome or Edge and install it there.',
    };
  }
  if (/Chrome\//.test(ua)) {
    return {
      browser: 'Chrome',
      steps: [
        'Click the install icon at the right of the address bar, or',
        'open the menu ⋮ → "Cast, save and share" → "Install page as app…".',
      ],
      note: NOT_INSTALLED_HINT,
    };
  }
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) {
    return {
      browser: 'Safari on Mac',
      steps: [
        'Open the File menu (or the Share button) and choose "Add to Dock…".',
        'Click "Add". Start split-lite from the Dock or Launchpad.',
      ],
      note: 'Needs macOS Sonoma (Safari 17) or newer.',
    };
  }
  return {
    browser: 'this browser',
    steps: ['Look for "Install" or "Add to Home screen" in the browser menu.'],
    note: 'If there is none, open this page in Chrome, Edge or Safari and install it there.',
  };
}
