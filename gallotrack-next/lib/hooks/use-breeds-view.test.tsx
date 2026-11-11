import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UIProvider, useUI } from '@/lib/contexts/ui-context';
import { useBreedsView } from '@/lib/hooks/use-breeds-view';

const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back }),
  usePathname: () => '/profiling',
  useSearchParams: () => new URLSearchParams(''),
}));

function Harness() {
  const ui = useUI();
  const { breedsViewOpen, openBreeds, closeBreeds } = useBreedsView();
  return (
    <div>
      <span>{breedsViewOpen ? 'breeds-open' : 'breeds-closed'}</span>
      <button type="button" onClick={() => ui.setProfilingSubTab('males')}>
        show cocks
      </button>
      <button type="button" onClick={openBreeds}>
        open breeds
      </button>
      <button type="button" onClick={closeBreeds}>
        close breeds
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <Harness />
    </UIProvider>,
  );
}

function lastUrl(mock: typeof push | typeof replace): URLSearchParams {
  const url = mock.mock.calls.at(-1)?.[0] as string;
  return new URLSearchParams(url.split('?')[1] || '');
}

describe('useBreedsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/profiling?tab=males&class=breeding-stock');
  });

  it('pushes ?view=breeds while preserving the background tab and list filters', () => {
    renderHarness();
    fireEvent.click(screen.getByRole('button', { name: 'show cocks' }));
    fireEvent.click(screen.getByRole('button', { name: 'open breeds' }));

    expect(screen.getByText('breeds-open')).toBeInTheDocument();
    expect(push).toHaveBeenCalled();
    const params = lastUrl(push);
    expect(params.get('view')).toBe('breeds');
    expect(params.get('tab')).toBe('males');
    expect(params.get('class')).toBe('breeding-stock');
    expect(back).not.toHaveBeenCalled();
  });

  it('removes ?view=breeds on close without touching the background tab', () => {
    renderHarness();
    fireEvent.click(screen.getByRole('button', { name: 'show cocks' }));
    fireEvent.click(screen.getByRole('button', { name: 'open breeds' }));
    fireEvent.click(screen.getByRole('button', { name: 'close breeds' }));

    expect(screen.getByText('breeds-closed')).toBeInTheDocument();
    expect(replace).toHaveBeenCalled();
    const params = lastUrl(replace);
    expect(params.get('view')).toBeNull();
    expect(params.get('tab')).toBe('males');
    expect(params.get('class')).toBe('breeding-stock');
    expect(back).not.toHaveBeenCalled();
  });

  it('follows browser back/forward popstate events', () => {
    renderHarness();

    act(() => {
      window.history.replaceState({}, '', '/profiling?tab=females&view=breeds');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByText('breeds-open')).toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, '', '/profiling?tab=females');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByText('breeds-closed')).toBeInTheDocument();
  });
});
