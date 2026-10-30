import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { DeferredPanel } from './DeferredPanel';

afterEach(() => vi.restoreAllMocks());

it('contains a failed lazy section while neighboring controls remain usable', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): never { throw new Error('Chunk unavailable'); }
  function Working() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>Still working {count}</button>;
  }
  render(<><Working /><DeferredPanel><Broken /></DeferredPanel></>);
  expect(screen.getByRole('alert')).toHaveTextContent('此区域加载失败，计时仍在继续。');
  expect(screen.getByRole('button', { name: '刷新页面' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Still working 0' }));
  expect(screen.getByRole('button', { name: 'Still working 1' })).toBeVisible();
});
