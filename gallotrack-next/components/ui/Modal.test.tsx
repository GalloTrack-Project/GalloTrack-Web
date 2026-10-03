import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Delete flock">
        body
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes dialog semantics with an accessible name', () => {
    render(
      <Modal open onClose={() => {}} title="Delete flock" description="This cannot be undone">
        body
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Delete flock');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone');
  });

  it('moves focus into the dialog on open', () => {
    render(
      <Modal open onClose={() => {}} title="Delete flock">
        body
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Delete flock">
        body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click by default', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Delete flock">
        body
      </Modal>,
    );
    fireEvent.click(screen.getByRole('dialog').parentElement?.querySelector('[aria-hidden="true"]') as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps itself open on backdrop click when closeOnBackdrop is false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Delete flock" closeOnBackdrop={false}>
        body
      </Modal>,
    );
    const backdrop = screen.getByRole('dialog').parentElement?.querySelector('[aria-hidden="true"]');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores focus to the previously focused element on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Modal open onClose={() => {}} title="Delete flock">
        body
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    rerender(
      <Modal open={false} onClose={() => {}} title="Delete flock">
        body
      </Modal>,
    );
    expect(trigger).toHaveFocus();

    trigger.remove();
  });

  it('traps Tab inside the dialog, wrapping last back to first', () => {
    render(
      <Modal
        open
        onClose={() => {}}
        title="Delete flock"
        footer={<button type="button">Confirm</button>}
      >
        body
      </Modal>,
    );

    const confirm = screen.getByRole('button', { name: 'Confirm' });
    confirm.focus();
    expect(confirm).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  });

  it('traps Shift+Tab inside the dialog, wrapping first back to last', () => {
    render(
      <Modal
        open
        onClose={() => {}}
        title="Delete flock"
        footer={<button type="button">Confirm</button>}
      >
        body
      </Modal>,
    );

    const close = screen.getByRole('button', { name: 'Close dialog' });
    close.focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
  });
});
