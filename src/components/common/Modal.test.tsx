import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Example" onClose={onClose}>
        <button type="button">Action</button>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus inside the dialog and restores the previous focus on close', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Before</button>
        <Modal open title="Example" onClose={onClose}>
          <button type="button" data-autofocus>
            Inside
          </button>
        </Modal>
      </>,
    );

    const before = screen.getByRole('button', { name: 'Before' });
    before.focus();

    // Re-open so the effect captures the intended previous focus.
    rerender(
      <>
        <button type="button">Before</button>
        <Modal open={false} title="Example" onClose={onClose} />
      </>,
    );
    before.focus();
    rerender(
      <>
        <button type="button">Before</button>
        <Modal open title="Example" onClose={onClose}>
          <button type="button" data-autofocus>
            Inside
          </button>
        </Modal>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();

    rerender(
      <>
        <button type="button">Before</button>
        <Modal open={false} title="Example" onClose={onClose} />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
  });
});
