import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useTabStore } from './stores/tabStore';

// Unit tests exercise business actions as the active tab. Coordination tests
// enter the real pending/reader states explicitly; production starts pending.
beforeEach(() => useTabStore.setState({ role: 'writer', storageNotice: null }));

afterEach(cleanup);
