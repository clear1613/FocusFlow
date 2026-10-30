import { STORAGE_KEY } from '../constants/defaults';
import { useTabStore } from '../stores/tabStore';
import { initializeApp } from './initializeApp';

interface CoordinationOptions {
  events: EventTarget;
  acquireLock?: (signal: AbortSignal, acquired: () => Promise<void>) => Promise<void>;
}

export function startTabCoordination({ events, acquireLock }: CoordinationOptions): () => void {
  let disconnect: (() => void) | undefined;
  let stopped = false;

  const connect = () => {
    if (stopped || disconnect) return;
    const controller = new AbortController();
    let current = true;
    let release: (() => void) | undefined;
    disconnect = () => {
      // Revoke synchronous business writes before another tab can get the lock.
      current = false;
      useTabStore.setState({ role: 'checking', storageNotice: null });
      controller.abort();
      release?.();
    };
    useTabStore.setState({ role: 'reader', storageNotice: null });
    initializeApp({ readOnly: true });
    if (!acquireLock) {
      useTabStore.setState({ role: 'unsupported' });
      return;
    }
    const failed = () => {
      if (current) useTabStore.setState({ role: 'unsupported', storageNotice: null });
    };
    try {
      void acquireLock(controller.signal, async () => {
        if (!current) return;
        useTabStore.setState({ role: 'initializing' });
        try {
          // A queued page must discard its old snapshot before enabling edits.
          const storageNotice = initializeApp();
          useTabStore.setState({ role: 'writer', storageNotice });
          await new Promise<void>(resolve => { release = resolve; });
        } catch {
          failed();
        }
      }).catch(failed);
    } catch {
      failed();
    }
  };
  const suspend = () => { disconnect?.(); disconnect = undefined; };
  const onStorage = (event: Event) => {
    const { key } = event as StorageEvent;
    if (disconnect && useTabStore.getState().role !== 'writer' && (key === STORAGE_KEY || key === null)) {
      initializeApp({ readOnly: true });
    }
  };
  events.addEventListener('storage', onStorage);
  events.addEventListener('pagehide', suspend);
  events.addEventListener('pageshow', connect);
  connect();
  return () => {
    stopped = true;
    suspend();
    events.removeEventListener('storage', onStorage);
    events.removeEventListener('pagehide', suspend);
    events.removeEventListener('pageshow', connect);
  };
}
