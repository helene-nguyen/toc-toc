//~ The current time, refreshed every `everyMs` — enough for timers and
// numbers; the trace itself redraws on every animation frame.
import { useEffect, useState } from 'react';

export const useNow = (everyMs = 250): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
};
