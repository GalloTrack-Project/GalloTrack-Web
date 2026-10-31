import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider, type AppLanguage } from '@/lib/i18n';
import { LanguageSelect, CompactLanguageSwitcher } from './LanguageSwitcher';

function readCookieLanguage(): AppLanguage {
  const match = document.cookie.match(/(?:^|;\s*)gt-lang=([^;]+)/);
  return (match?.[1] as AppLanguage) ?? 'en';
}

function renderSwitcher(initialLanguage: AppLanguage = 'en') {
  return render(
    <LanguageProvider initialLanguage={initialLanguage}>
      <CompactLanguageSwitcher />
    </LanguageProvider>,
  );
}

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    // Clear document cookie
    document.cookie = 'gt-lang=; path=/; max-age=0';
    document.documentElement.lang = 'en';
  });

  it('renders LanguageSelect with all three options', () => {
    render(
      <LanguageProvider initialLanguage="en">
        <LanguageSelect />
      </LanguageProvider>,
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Tagalog')).toBeInTheDocument();
    expect(screen.getByText(/Hiligaynon/)).toBeInTheDocument();
    expect(screen.getByText(/Beta/i)).toBeInTheDocument();
  });

  it('updates language, cookie, and html lang when option is selected', () => {
    render(
      <LanguageProvider initialLanguage="en">
        <LanguageSelect />
      </LanguageProvider>,
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'tl' } });

    expect(document.cookie).toContain('gt-lang=tl');
    expect(document.documentElement.lang).toBe('tl');
  });

  it('opens the menu on click without changing the language', () => {
    renderSwitcher('en');

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(document.cookie).not.toContain('gt-lang=tl');

    expect(screen.getByRole('menuitemradio', { name: /English/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: /Tagalog/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('lists exactly the three app languages and checks the active one', () => {
    renderSwitcher('tl');

    fireEvent.click(screen.getByRole('button'));

    const options = screen.getAllByRole('menuitemradio');
    expect(options).toHaveLength(3);
    expect(screen.getByRole('menuitemradio', { name: /English/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('menuitemradio', { name: /Tagalog/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: /Hiligaynon/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('selects each language directly, closes the menu, and persists after remount', () => {
    const { unmount } = renderSwitcher('en');
    const button = screen.getByRole('button');

    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Hiligaynon/ }));

    expect(document.documentElement.lang).toBe('hil');
    expect(document.cookie).toContain('gt-lang=hil');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveTextContent('Hiligaynon');

    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Tagalog/ }));

    expect(document.documentElement.lang).toBe('tl');
    expect(document.cookie).toContain('gt-lang=tl');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveTextContent('Tagalog');

    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /English/ }));

    expect(document.documentElement.lang).toBe('en');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveTextContent('English');

    // Persisted choice survives a remount (server reads the same cookie).
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Hiligaynon/ }));
    const persistedLanguage = readCookieLanguage();
    unmount();

    renderSwitcher(persistedLanguage);
    const remountedButton = screen.getByRole('button');
    expect(remountedButton).toHaveTextContent('Hiligaynon');

    fireEvent.click(remountedButton);
    expect(screen.getByRole('menuitemradio', { name: /Hiligaynon/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('closes on Escape and returns focus to the button', () => {
    renderSwitcher('en');
    const button = screen.getByRole('button');

    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('menuitemradio', { name: /English/ }), {
      key: 'Escape',
    });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('closes on outside click and returns focus to the button', () => {
    renderSwitcher('en');
    const button = screen.getByRole('button');

    fireEvent.click(button);
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('supports arrow, Home, and End keyboard navigation', async () => {
    renderSwitcher('en');
    const button = screen.getByRole('button');

    button.focus();
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    const items = screen.getAllByRole('menuitemradio');
    await waitFor(() => expect(items[0]).toHaveFocus());

    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: 'End' });
    expect(items[2]).toHaveFocus();

    fireEvent.keyDown(items[2], { key: 'Home' });
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(items[2]).toHaveFocus();

    fireEvent.click(items[2]);
    expect(document.documentElement.lang).toBe('hil');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('has no leftover cycle logic', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'components/i18n/LanguageSwitcher.tsx'),
      'utf8',
    );

    expect(source).not.toMatch(/nextLang|handleCycle/);
  });
});
