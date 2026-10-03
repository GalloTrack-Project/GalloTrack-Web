import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast, type ToastVariant } from './Toast';

function Consumer({ variant }: { variant?: ToastVariant }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: 'Flock saved', variant })}>
      fire
    </button>
  );
}

function renderWithProvider(variant?: ToastVariant) {
  return render(
    <ToastProvider>
      <Consumer variant={variant} />
    </ToastProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('throws a helpful error when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(/useToast must be used within <ToastProvider>/);
    spy.mockRestore();
  });

  it('exposes a labelled notifications region', () => {
    renderWithProvider();
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('announces a default toast politely with role=status', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByRole('status')).toHaveTextContent('Flock saved');
  });

  it('announces an error toast assertively with role=alert', () => {
    renderWithProvider('danger');
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Flock saved');
  });

  it('dismisses a toast through its labelled button', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('auto-dismisses after the default duration', () => {
    vi.useFakeTimers();
    renderWithProvider();
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
