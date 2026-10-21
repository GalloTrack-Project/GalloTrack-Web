import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '@/lib/i18n';
import { LanguageSelect, CompactLanguageSwitcher } from './LanguageSwitcher';

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
      </LanguageProvider>
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
      </LanguageProvider>
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'tl' } });

    expect(document.cookie).toContain('gt-lang=tl');
    expect(document.documentElement.lang).toBe('tl');
  });

  it('renders CompactLanguageSwitcher and cycles languages on click', () => {
    render(
      <LanguageProvider initialLanguage="en">
        <CompactLanguageSwitcher variant="button" />
      </LanguageProvider>
    );

    const button = screen.getByRole('button');
    // Shows full language name, not uppercase code
    expect(button).toHaveTextContent('English');
    // aria-label says what the button does
    expect(button).toHaveAccessibleName(/Change language.*English/i);

    // Cycle EN -> TL
    fireEvent.click(button);
    expect(button).toHaveTextContent('Tagalog');
    expect(document.documentElement.lang).toBe('tl');

    // Cycle TL -> HIL
    fireEvent.click(button);
    expect(button).toHaveTextContent('Hiligaynon');
    expect(screen.getByText(/beta/i)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('hil');

    // Cycle HIL -> EN
    fireEvent.click(button);
    expect(button).toHaveTextContent('English');
    expect(document.documentElement.lang).toBe('en');
  });

  it('renders CompactLanguageSwitcher select variant cleanly', () => {
    render(
      <LanguageProvider initialLanguage="hil">
        <CompactLanguageSwitcher variant="select" />
      </LanguageProvider>
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('hil');
  });
});
