import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RegistryNav from './RegistryNav';

describe('RegistryNav', () => {
  const dummyCounts = {
    males: 11,
    females: 14,
    offspring: 20,
    sireMaterial: 4,
  };

  it('renders the 4 main tabs in exact required order with badges (Sire Material tab absent)', () => {
    render(
      <RegistryNav
        currentTab="males"
        onSelectTab={vi.fn()}
        counts={dummyCounts}
      />
    );

    // Desktop tabs
    const tabs = screen.getAllByRole('tab');
    // We expect desktop + mobile tabs (4 each = 8 total)
    expect(tabs.length).toBe(8);

    // Verify the 4 desktop tabs in exact order
    const desktopTabs = tabs.slice(0, 4);
    expect(desktopTabs[0]).toHaveTextContent(/Breeding Male/i);
    expect(desktopTabs[0]).toHaveTextContent('11');

    expect(desktopTabs[1]).toHaveTextContent(/Breeding Female/i);
    expect(desktopTabs[1]).toHaveTextContent('14');

    expect(desktopTabs[2]).toHaveTextContent(/Offspring/i);
    expect(desktopTabs[2]).toHaveTextContent('20');

    expect(desktopTabs[3]).toHaveTextContent(/Match Logs/i);

    expect(screen.queryByRole('tab', { name: /Sire Material/i })).toBeNull();
  });

  it('marks current tab with aria-selected=true and others with aria-selected=false', () => {
    render(
      <RegistryNav
        currentTab="males"
        onSelectTab={vi.fn()}
        counts={dummyCounts}
      />
    );

    const maleTabs = screen.getAllByRole('tab', { name: /Breeding Male/i });
    expect(maleTabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(maleTabs[0]).toHaveAttribute('tabindex', '0');

    const femaleTabs = screen.getAllByRole('tab', { name: /Breeding Female/i });
    expect(femaleTabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(femaleTabs[0]).toHaveAttribute('tabindex', '-1');
  });

  it('triggers onSelectTab when clicked', () => {
    const handleSelect = vi.fn();
    render(
      <RegistryNav
        currentTab="males"
        onSelectTab={handleSelect}
        counts={dummyCounts}
      />
    );

    const femaleTab = screen.getAllByRole('tab', { name: /Breeding Female/i })[0];
    fireEvent.click(femaleTab);
    expect(handleSelect).toHaveBeenCalledWith('females');
  });

  it('supports roving tabindex keyboard navigation across tabs (ArrowRight, ArrowLeft, Home, End)', () => {
    const handleSelect = vi.fn();
    render(
      <RegistryNav
        currentTab="males"
        onSelectTab={handleSelect}
        counts={dummyCounts}
      />
    );

    const firstTab = screen.getAllByRole('tab', { name: /Breeding Male/i })[0];
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    expect(handleSelect).toHaveBeenCalledWith('females');

    fireEvent.keyDown(firstTab, { key: 'End' });
    expect(handleSelect).toHaveBeenCalledWith('matchForm');

    fireEvent.keyDown(firstTab, { key: 'Home' });
    expect(handleSelect).toHaveBeenCalledWith('males');
  });

  it('renders mobile fixed bottom nav with 44px+ touch targets and short labels', () => {
    const { container } = render(
      <RegistryNav
        currentTab="males"
        onSelectTab={vi.fn()}
        counts={dummyCounts}
      />
    );

    const mobileNav = container.querySelector('.md\\:hidden');
    expect(mobileNav).toBeInTheDocument();

    const mobileButtons = mobileNav?.querySelectorAll('button');
    expect(mobileButtons?.length).toBe(4);

    mobileButtons?.forEach((btn) => {
      expect(btn.className).toContain('min-h-[48px]');
    });

    // Check short labels
    expect(mobileButtons?.[0]).toHaveTextContent('Male');
    expect(mobileButtons?.[1]).toHaveTextContent('Female');
    expect(mobileButtons?.[2]).toHaveTextContent('Offspring');
    expect(mobileButtons?.[3]).toHaveTextContent('Matches');
  });
});
