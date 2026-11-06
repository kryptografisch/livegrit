import { afterEach, describe, expect, it, vi } from 'vitest';
import { WindowSync } from '../src/lib/sync/windowSync.svelte';
import { FakeHub, FakeLocks, flush } from './syncFakes';

const windows: WindowSync[] = [];

afterEach(() => {
  for (const w of windows.splice(0)) w.stop();
  vi.useRealTimers();
});

interface TestWindow {
  sync: WindowSync;
  /** The window crashed: no bye, its locks are released by the browser. */
  crash: () => void;
}

function setup(withLocks = true) {
  const hub = new FakeHub();
  const locks = new FakeLocks();
  const open = (id: string): TestWindow => {
    const bus = hub.bus();
    const client = locks.client();
    const sync = new WindowSync({ bus, locks: withLocks ? client.request : null, id });
    windows.push(sync);
    sync.start();
    return {
      sync,
      crash: () => {
        bus.disconnect();
        client.kill();
      },
    };
  };
  return { open };
}

describe('WindowSync', () => {
  it('shows a Settings window to the Timer window until it says bye', async () => {
    const { open } = setup();
    const timer = open('timer').sync;
    timer.setState('timer', 'NotRunning');
    const settings = open('settings').sync;
    settings.setState('settings', 'NotRunning');
    await flush();
    expect(timer.settingsOpen).toBe(true);
    expect(settings.settingsOpen).toBe(false);

    settings.stop();
    await flush();
    expect(timer.settingsOpen).toBe(false);
  });

  it('finds a Settings window that was open before the Timer window started', async () => {
    const { open } = setup();
    open('settings').sync.setState('settings', 'NotRunning');
    await flush();
    const timer = open('timer').sync;
    timer.setState('timer', 'NotRunning');
    await flush();
    expect(timer.settingsOpen).toBe(true);
  });

  it('notices a crashed Settings window through its released lock', async () => {
    const { open } = setup();
    const timer = open('timer').sync;
    timer.setState('timer', 'NotRunning');
    const settings = open('settings');
    settings.sync.setState('settings', 'NotRunning');
    await flush();
    expect(timer.settingsOpen).toBe(true);

    settings.crash();
    await flush();
    expect(timer.settingsOpen).toBe(false);

    // A new one is noticed again (and its crash too).
    const again = open('settings2');
    again.sync.setState('settings', 'NotRunning');
    await flush();
    expect(timer.settingsOpen).toBe(true);
    again.crash();
    await flush();
    expect(timer.settingsOpen).toBe(false);
  });

  it('keeps a second Settings window when the first one closes', async () => {
    const { open } = setup();
    const timer = open('timer').sync;
    timer.setState('timer', 'NotRunning');
    const first = open('s1');
    first.sync.setState('settings', 'NotRunning');
    const second = open('s2');
    second.sync.setState('settings', 'NotRunning');
    await flush();
    first.crash();
    await flush();
    await flush();
    expect(timer.settingsOpen).toBe(true);
    second.sync.stop();
    await flush();
    expect(timer.settingsOpen).toBe(false);
  });

  it('tells the Settings window about attempts in the Timer window', async () => {
    const { open } = setup();
    const timer = open('timer');
    timer.sync.setState('timer', 'NotRunning');
    const settings = open('settings').sync;
    settings.setState('settings', 'NotRunning');
    await flush();
    expect(settings.remoteAttemptInProgress).toBe(false);

    timer.sync.setState('timer', 'Running');
    await flush();
    expect(settings.remoteAttemptInProgress).toBe(true);
    timer.sync.setState('timer', 'Paused');
    await flush();
    expect(settings.remoteAttemptInProgress).toBe(true);
    timer.sync.setState('timer', 'Ended');
    await flush();
    expect(settings.remoteAttemptInProgress).toBe(false);
    expect(settings.remoteAttemptEnded).toBe(true);

    // A crashed Timer window doesn't block the Settings window.
    timer.sync.setState('timer', 'Running');
    await flush();
    timer.crash();
    await flush();
    expect(settings.remoteAttemptInProgress).toBe(false);
  });

  it('follows a window that switches from Settings to Timer', async () => {
    const { open } = setup();
    const timer = open('timer').sync;
    timer.setState('timer', 'NotRunning');
    const other = open('other').sync;
    other.setState('settings', 'NotRunning');
    await flush();
    expect(timer.settingsOpen).toBe(true);
    other.setState('timer', 'NotRunning');
    await flush();
    expect(timer.settingsOpen).toBe(false);
  });

  it('passes "changed" to the other windows only', async () => {
    const { open } = setup();
    const a = open('a').sync;
    const b = open('b').sync;
    const seenA = vi.fn();
    const seenB = vi.fn();
    a.onChanged(seenA);
    b.onChanged(seenB);
    a.notifyChanged();
    await flush();
    expect(seenA).not.toHaveBeenCalled();
    expect(seenB).toHaveBeenCalledTimes(1);
  });

  it('works without Web Locks: bye and the opened window handle', async () => {
    vi.useFakeTimers();
    const { open } = setup(false);
    const timer = open('timer').sync;
    timer.setState('timer', 'NotRunning');
    const settings = open('settings');
    settings.sync.setState('settings', 'NotRunning');
    await vi.advanceTimersByTimeAsync(1);
    expect(timer.settingsOpen).toBe(true);

    const handle = { closed: false };
    timer.watchWindow(handle);
    settings.crash();
    await vi.advanceTimersByTimeAsync(1000);
    expect(timer.settingsOpen).toBe(true); // no lock: only the handle can tell
    handle.closed = true;
    await vi.advanceTimersByTimeAsync(600);
    expect(timer.settingsOpen).toBe(false);
  });

  it('asks Settings windows to close; one that stays shows up again', async () => {
    const { open } = setup();
    const timer = open('timer').sync;
    timer.setState('timer', 'NotRunning');
    const closing = open('popup');
    closing.sync.setState('settings', 'NotRunning');
    closing.sync.onCloseRequest(() => closing.sync.stop());
    const tab = open('tab').sync;
    tab.setState('settings', 'NotRunning');
    const tabAsked = vi.fn();
    tab.onCloseRequest(tabAsked); // a normal tab: window.close() does nothing
    const timerAsked = vi.fn();
    timer.onCloseRequest(timerAsked);
    await flush();

    timer.closeSettingsWindows();
    expect(timer.settingsOpen).toBe(false);
    await flush();
    expect(tabAsked).toHaveBeenCalledTimes(1);
    expect(timerAsked).not.toHaveBeenCalled(); // only Settings windows react
    expect(timer.settingsOpen).toBe(true); // the tab announced itself again

    tab.stop();
    await flush();
    expect(timer.settingsOpen).toBe(false);
  });

  it('ignores foreign messages', async () => {
    const hub = new FakeHub();
    const sync = new WindowSync({ bus: hub.bus(), locks: null, id: 'x' });
    windows.push(sync);
    sync.start();
    const raw = hub.bus();
    raw.post({ type: 'presence', from: 'y', role: 'nope', phase: 'Running' } as never);
    raw.post('junk' as never);
    await flush();
    expect(sync.settingsOpen).toBe(false);
    expect(sync.remoteAttemptInProgress).toBe(false);
  });
});
