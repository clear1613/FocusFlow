import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initializeApp } from './services/initializeApp';

const storageNotice = initializeApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialStorageNotice={storageNotice} />
  </StrictMode>,
);
