'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/components/ui/utils';
import { isActiveNav, MOBILE_PRIMARY_COUNT, type NavItem } from '@/lib/nav-manifest';

import { useT } from '@/lib/i18n';

type Props = {
  navItems: NavItem[];
  pathname: string;
};

export default function MobileNav({ navItems, pathname }: Props) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = navItems.slice(0, MOBILE_PRIMARY_COUNT);
  const overflow = navItems.slice(MOBILE_PRIMARY_COUNT);
  const overflowActive = overflow.some((item) => isActiveNav(item, pathname));

  const itemClass = (active: boolean) =>
    cn(
      'flex flex-col items-center justify-center flex-1 min-w-0 h-full px-0.5 py-1 gap-1 transition-colors duration-150 active:scale-95',
      active
        ? 'text-accent font-semibold'
        : 'text-muted-foreground font-medium hover:text-foreground',
    );

  return (
    <>
      <nav
        aria-label="Mobile"
        className="bg-card/95 border-border fixed right-0 bottom-0 left-0 z-50 border-t pb-[env(safe-area-inset-bottom,0px)] shadow-2xl backdrop-blur-md md:hidden"
      >
        <div className="flex h-16 items-center justify-around px-1">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActiveNav(item, pathname) ? 'page' : undefined}
              className={itemClass(isActiveNav(item, pathname))}
            >
              <item.icon className="h-5 w-5" />
              <span className="w-full truncate text-center text-xs leading-tight tracking-tight sm:text-sm">
                {item.shortLabel}
              </span>
            </Link>
          ))}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label={t('nav.morePages')}
              data-active={overflowActive}
              className={itemClass(overflowActive)}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              <span className="w-full truncate text-center text-xs leading-tight tracking-tight sm:text-sm">
                {t('nav.more')}
              </span>
            </button>
          )}
        </div>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t('nav.more')}
        description={t('nav.morePages')}
        icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
      >
        <ul className="space-y-1">
          {overflow.map((item) => {
            const active = isActiveNav(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors duration-150',
                    active
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium',
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
