import { describe, expect, it, vi } from 'vitest';
import { PwaInstall } from '../src/lib/pwa/pwaInstall.svelte';
import { installHelp } from '../src/lib/pwa/installHelp';

function promptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn(async () => {});
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: 'web' }) });
  return { event, prompt };
}

function setup(standalone = false) {
  const target = new EventTarget();
  const install = new PwaInstall();
  install.start(target, { standalone });
  return { target, install };
}

describe('PwaInstall', () => {
  it('without the browser event: not installed, no dialog, install() returns false', async () => {
    const { install } = setup();
    expect(install.installed).toBe(false);
    expect(install.canPrompt).toBe(false);
    expect(await install.install()).toBe(false);
  });

  it('knows when it already runs as the installed app', () => {
    expect(setup(true).install.installed).toBe(true);
  });

  it('keeps the event, suppresses the browser infobar and prompts on install', async () => {
    const { target, install } = setup();
    const { event, prompt } = promptEvent('accepted');
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(install.canPrompt).toBe(true);

    expect(await install.install()).toBe(true);
    expect(prompt).toHaveBeenCalledOnce();
    expect(install.installed).toBe(true);
    expect(await install.install()).toBe(false); // the event works only once
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('after a dismiss: no dialog until the browser offers it again', async () => {
    const { target, install } = setup();
    target.dispatchEvent(promptEvent('dismissed').event);
    await install.install();
    expect(install.installed).toBe(false);
    expect(install.canPrompt).toBe(false);
    target.dispatchEvent(promptEvent('dismissed').event);
    expect(install.canPrompt).toBe(true);
  });

  it('is installed after `appinstalled` (e.g. from the browser menu)', () => {
    const { target, install } = setup();
    target.dispatchEvent(new Event('appinstalled'));
    expect(install.installed).toBe(true);
  });

  it('stops listening', () => {
    const { target, install } = setup();
    install.stop();
    target.dispatchEvent(promptEvent('accepted').event);
    expect(install.canPrompt).toBe(false);
  });
});

describe('installHelp', () => {
  const help = (userAgent: string, maxTouchPoints = 0, secure = true) =>
    installHelp({ userAgent, maxTouchPoints, secure });

  const UA = {
    iphoneSafari:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    iphoneChrome:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
    macSafari:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    androidChrome:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
    androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
    samsung:
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
    firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
    chrome:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
    opera:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 OPR/115.0',
  };

  it.each([
    [UA.iphoneSafari, 0, 'Safari on iPhone/iPad'],
    [UA.macSafari, 5, 'Safari on iPhone/iPad'], // iPadOS reports a Mac
    [UA.iphoneChrome, 0, 'this browser on iPhone/iPad'],
    [UA.macSafari, 0, 'Safari on Mac'],
    [UA.androidChrome, 0, 'Chrome on Android'],
    [UA.androidFirefox, 0, 'Firefox on Android'],
    [UA.samsung, 0, 'Samsung Internet'],
    [UA.firefox, 0, 'Firefox'],
    [UA.chrome, 0, 'Chrome'],
    [UA.edge, 0, 'Edge'],
    [UA.opera, 0, 'Opera'],
    ['SomethingElse/1.0', 0, 'this browser'],
  ])('%s (touch %i) → %s', (ua, touch, browser) => {
    const result = help(ua, touch);
    expect(result.browser).toBe(browser);
    // Either steps, or "not supported" plus what to do instead.
    if (result.unsupported) expect(result.tip).toBeTruthy();
    else expect(result.steps.length).toBeGreaterThan(0);
  });

  it('desktop Firefox: not supported, suggests a bookmark', () => {
    const result = help(UA.firefox);
    expect(result.unsupported).toMatch(/does not support/);
    expect(result.steps).toEqual([]);
    expect(result.tip).toMatch(/bookmark/);
  });

  it('says that http pages cannot be installed', () => {
    expect(help(UA.chrome, 0, false).note).toMatch(/https/);
  });
});
