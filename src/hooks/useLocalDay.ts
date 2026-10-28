import { useEffect, useState } from 'react';
import { addDays, startOfDay } from 'date-fns';

// Statistics must refresh at a local day boundary even when no store changes.
export function useLocalDay(): number {
  const [day, setDay] = useState(() => startOfDay(new Date()).getTime());
  useEffect(() => {
    let timeout: number;
    const schedule = () => {
      window.clearTimeout(timeout);
      const now = new Date();
      timeout = window.setTimeout(() => {
        setDay(startOfDay(new Date()).getTime());
        schedule();
      }, Math.max(1, addDays(startOfDay(now), 1).getTime() - now.getTime()));
    };
    const sync = () => {
      setDay(startOfDay(new Date()).getTime());
      schedule();
    };
    const visible = () => { if (document.visibilityState === 'visible') sync(); };
    schedule();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', sync);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', sync);
    };
  }, []);
  return day;
}
