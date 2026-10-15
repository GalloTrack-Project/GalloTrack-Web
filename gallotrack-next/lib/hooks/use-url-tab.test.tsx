import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/profiling',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => mocks.pathname,
}));

import { useUrlTab } from './use-url-tab';

const VALUES = ['form', 'males', 'females'] as const;

type Tab = 'form' | 'males' | 'females';

function renderTabHook() {
  return renderHook(() =>
    useUrlTab<Tab>({
      param: 'tab',
      values: VALUES,
      defaultValue: 'form',
    }),
  );
}

describe('useUrlTab', () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.pathname = '/profiling';
    window.history.replaceState(null, '', '/profiling');
  });

  it('falls back to the default when the param is missing', () => {
    const { result } = renderTabHook();
    expect(result.current[0]).toBe('form');
    expect(result.current[2].paramPresent).toBe(false);
    expect(result.current[2].change).toBe('mount');
  });

  it('reads a valid param on mount', () => {
    window.history.replaceState(null, '', '/profiling?tab=females');
    const { result } = renderTabHook();
    expect(result.current[0]).toBe('females');
    expect(result.current[2].paramPresent).toBe(true);
  });

  it('ignores an invalid param value', () => {
    window.history.replaceState(null, '', '/profiling?tab=nonsense');
    const { result } = renderTabHook();
    expect(result.current[0]).toBe('form');
    expect(result.current[2].paramPresent).toBe(false);
  });

  it('setValue writes the param with router.replace and scroll: false', () => {
    const { result } = renderTabHook();
    act(() => result.current[1]('males'));
    expect(result.current[0]).toBe('males');
    expect(mocks.replace).toHaveBeenCalledWith('/profiling?tab=males', { scroll: false });
  });

  it('setValue with the default removes the param and preserves others', () => {
    window.history.replaceState(null, '', '/profiling?status=active&tab=males');
    const { result } = renderTabHook();
    act(() => result.current[1]('form'));
    expect(mocks.replace).toHaveBeenCalledWith('/profiling?status=active', { scroll: false });
  });

  it('updates on popstate', () => {
    const { result } = renderTabHook();
    act(() => {
      window.history.replaceState(null, '', '/profiling?tab=females');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBe('females');
    expect(result.current[2].change).toBe('popstate');
    expect(result.current[2].paramPresent).toBe(true);
  });

  it('popstate to a URL without the param returns the default', () => {
    window.history.replaceState(null, '', '/profiling?tab=females');
    const { result } = renderTabHook();
    expect(result.current[0]).toBe('females');
    act(() => {
      window.history.replaceState(null, '', '/profiling');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBe('form');
    expect(result.current[2].paramPresent).toBe(false);
  });

  it('maps an aliased param to the canonical value on mount and popstate', () => {
    window.history.replaceState(null, '', '/profiling?category=no-fight');
    const { result } = renderHook(() =>
      useUrlTab<'all' | 'fight-prospects'>({
        param: 'category',
        values: ['all', 'fight-prospects'],
        defaultValue: 'all',
        aliases: { 'no-fight': 'fight-prospects' },
      }),
    );
    expect(result.current[0]).toBe('fight-prospects');
    expect(result.current[2].paramPresent).toBe(true);
  });
});
