import { useEffect, useRef } from 'react';

/** Poll `callback` on an interval while `enabled` is true. */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  enabled: boolean,
  intervalMs = 3000
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      void callbackRef.current();
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
}
