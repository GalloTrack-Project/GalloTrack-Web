'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui';
import { useSystemConfigNav } from '@/lib/contexts/system-config-nav';
import {
  DEFAULT_SYSTEM_CONFIG_SECTION,
  getSystemConfigHref,
  isSystemConfigPath,
} from '@/lib/system-config-nav';
import type { NavItem } from '@/lib/nav-manifest';

const SESSION_KEY = 'system-config-expanded';
const SUBMENU_ID = 'system-config-submenu';

type Props = {
  item: NavItem;
};

/**
 * Expandable sidebar entry for System Config. The parent button toggles the
 * section list; on first open from another page it navigates to General.
 */
export default function SystemConfigSidebarItem({ item }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeSection, requestSection, setActiveSection } = useSystemConfigNav();
  const isSystemActive = isSystemConfigPath(pathname);
  const [expanded, setExpanded] = useState(isSystemActive);
  const parentRef = useRef<HTMLButtonElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  // Auto-expand whenever the route belongs to System Config (refresh/deep link).
  useEffect(() => {
    if (isSystemActive) {
      setExpanded(true);
      return;
    }
    try {
      const stored = window.sessionStorage.getItem(SESSION_KEY);
      if (stored !== null) setExpanded(stored === '1');
    } catch {
      /* sessionStorage can be unavailable in private modes. */
    }
  }, [isSystemActive]);

  // Collapse state survives for the session only.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, expanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [expanded]);

  const focusLink = (index: number) => {
    const links = linkRefs.current.filter(Boolean) as HTMLAnchorElement[];
    if (links.length === 0) return;
    links[(index + links.length) % links.length]?.focus();
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);

    // First open from another page lands on General.
    if (next && !isSystemActive) {
      setActiveSection(DEFAULT_SYSTEM_CONFIG_SECTION);
      router.push(getSystemConfigHref(DEFAULT_SYSTEM_CONFIG_SECTION));
    }
  };

  const handleParentKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setExpanded(true);
      window.requestAnimationFrame(() => focusLink(0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setExpanded(true);
      window.requestAnimationFrame(() => focusLink(-1));
    }
  };

  const handleSubmenuKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    const links = linkRefs.current.filter(Boolean) as HTMLAnchorElement[];
    if (links.length === 0) return;
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusLink(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusLink(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusLink(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusLink(links.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setExpanded(false);
      parentRef.current?.focus();
    }
  };

  const submenu = item.submenu ?? [];

  return (
    <div>
      <button
        ref={parentRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={SUBMENU_ID}
        onClick={toggle}
        onKeyDown={handleParentKeyDown}
        className={cn(
          'flex w-full items-center gap-3 rounded-sm px-4 py-2.5 text-left text-sm tracking-wide transition-colors duration-150',
          'focus-visible:ring-accent focus-visible:ring-offset-card focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          isSystemActive
            ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium',
        )}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1">{item.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {submenu.length > 0 && (
        <ul
          id={SUBMENU_ID}
          aria-label="System Config sections"
          hidden={!expanded}
          className="mt-1 space-y-1"
        >
          {submenu.map((section, index) => {
            const isActive = isSystemActive && activeSection === section.id;

            return (
              <li key={section.id}>
                <Link
                  ref={(element) => {
                    linkRefs.current[index] = element;
                  }}
                  href={section.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                      return;
                    }
                    event.preventDefault();
                    requestSection(section.id);
                  }}
                  onKeyDown={handleSubmenuKeyDown}
                  className={cn(
                    'focus-visible:ring-accent focus-visible:ring-inset flex items-center gap-2 rounded-sm border-l-2 py-2 pr-3 pl-10 text-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none',
                    isActive
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground border-transparent font-medium',
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
