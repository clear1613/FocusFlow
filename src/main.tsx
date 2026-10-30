import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { TabApplication } from './TabApplication';
import { startTabCoordination } from './services/tabCoordinator';

const stopCoordination = startTabCoordination({
  events: window,
  acquireLock: navigator.locks
    ? async (signal, acquired) => { await navigator.locks.request('focusflow:writer', { signal }, acquired); }
    : undefined,
});
if (import.meta.hot) import.meta.hot.dispose(stopCoordination);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TabApplication />
  </StrictMode>,
);
