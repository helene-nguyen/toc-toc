//~ Keeps the screen on while a monitoring runs. Browsers release the lock
// when the tab is hidden, so it is asked again when the app comes back.
// Needs HTTPS (Tailscale on the Pi); without it the screen may sleep.
import { useEffect } from 'react';

export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => (lock = sentinel))
        .catch(() => {
          // refused (low battery, not HTTPS…): the app works anyway
        });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
};
