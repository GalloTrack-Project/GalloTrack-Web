'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/components/ui/utils';
import { isActiveNav, MOBILE_PRIMARY_COUNT, type NavItem } from '@/lib/nav-manifest';
import { useSystemConfigNav } from '@/lib/contexts/system-config-nav';
import { isSystemConfigPath } from '@/lib/system-config-nav';

import { useT } from '@/lib/i18n';

type Props = {
  navItems: NavItem[];
  pathname: string;
};

export default function MobileNav({ navItems, pathname }: Props) {
  const t = useT();
  const { activeSection, requestSection } = useSystemConfigNav();
  const [moreOpen, setMoreOpen] = useState(false);
  const [configItem, setConfigItem] = useState<NavItem | null>(null);
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
          {primary.map((item) => {
            const active = isActiveNav(item, pathname);

            if (item.submenu) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setConfigItem(item)}
                  aria-haspopup="dialog"
                  aria-expanded={configItem?.href === item.href}
                  className={itemClass(active)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="w-full truncate text-center text-xs leading-tight tracking-tight sm:text-sm">
                    {item.shortLabel}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={itemClass(active)}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="w-full truncate text-center text-xs leading-tight tracking-tight sm:text-sm">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
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

      <Modal
        open={configItem !== null}
        onClose={() => setConfigItem(null)}
        title={configItem?.label ?? 'System Config'}
        description="Choose a configuration section"
        icon={
          configItem ? <configItem.icon className="h-4 w-4" /> : undefined
        }
      >
        <ul className="space-y-1">
          {configItem?.submenu?.map((section) => {
            const active =
              isSystemConfigPath(pathname) && activeSection === section.id;

            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                      return;
                    }
                    event.preventDefault();
                    if (active) {
                      setConfigItem(null);
                      return;
                    }
                    if (requestSection(section.id)) setConfigItem(null);
                  }}
                  className={cn(
                    'focus-visible:ring-accent flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none',
                    active
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium',
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
