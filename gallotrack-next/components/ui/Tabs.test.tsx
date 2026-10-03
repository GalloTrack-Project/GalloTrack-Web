import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const items = [
  { value: 'overview', label: 'Overview', content: <p>Overview panel</p> },
  { value: 'eggs', label: 'Eggs', content: <p>Eggs panel</p> },
  { value: 'health', label: 'Health', content: <p>Health panel</p> },
];

describe('Tabs', () => {
  it('renders a labelled tablist with the first tab selected', () => {
    render(<Tabs items={items} aria-label="Flock sections" />);
    expect(screen.getByRole('tablist', { name: 'Flock sections' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('links each tab to its panel and back', () => {
    render(<Tabs items={items} aria-label="Flock sections" />);
    const panel = screen.getByRole('tabpanel');
    const tab = screen.getByRole('tab', { name: 'Overview' });
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(tab).toHaveAttribute('aria-controls', panel.id);
  });

  it('uses a roving tabindex so only the active tab is tabbable', () => {
    render(<Tabs items={items} aria-label="Flock sections" />);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Eggs' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves selection with ArrowRight and wraps around', () => {
    render(<Tabs items={items} aria-label="Flock sections" />);
    const tablist = screen.getByRole('tablist');

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Eggs' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Eggs panel')).toBeInTheDocument();

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves selection with ArrowLeft and wraps around', () => {
    render(<Tabs items={items} aria-label="Flock sections" />);
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Health' })).toHaveAttribute('aria-selected', 'true');
  });

  it('jumps to first and last with Home and End', () => {
    render(<Tabs items={items} aria-label="Flock sections" />);
    const tablist = screen.getByRole('tablist');

    fireEvent.keyDown(tablist, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Health' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('skips disabled tabs when navigating by keyboard', () => {
    const withDisabled = [
      { value: 'a', label: 'A', content: <p>A</p> },
      { value: 'b', label: 'B', disabled: true, content: <p>B</p> },
      { value: 'c', label: 'C', content: <p>C</p> },
    ];
    render(<Tabs items={withDisabled} aria-label="Sections" />);
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'C' })).toHaveAttribute('aria-selected', 'true');
  });

  it('respects the vertical orientation', () => {
    render(<Tabs items={items} aria-label="Flock sections" vertical />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: 'Eggs' })).toHaveAttribute('aria-selected', 'true');
  });
});
