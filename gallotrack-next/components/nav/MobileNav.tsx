'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/components/ui/utils';
import { isActiveNav, MOBILE_PRIMARY_COUNT, type NavItem } from '@/lib/nav-manifest';

type Props = {
  navItems: NavItem[];
  pathname: string;
};

export default function MobileNav({ navItems, pathname }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = navItems.slice(0, MOBILE_PRIMARY_COUNT);
  const overflow = navItems.slice(MOBILE_PRIMARY_COUNT);
  const overflowActive = overflow.some((item) => isActiveNav(item, pathname));

  const itemClass = (active: boolean) =>
    cn(
      'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-colors duration-150 active:scale-95',
      active ? 'text-accent font-semibold' : 'text-muted-foreground font-medium hover:text-foreground',
    );

  return (
    <>
      <nav
        aria-label="Mobile"
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex justify-around items-center h-16 px-1">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActiveNav(item, pathname) ? 'page' : undefined}
              className={itemClass(isActiveNav(item, pathname))}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm tracking-tight">{item.shortLabel}</span>
            </Link>
          ))}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More navigation pages"
              data-active={overflowActive}
              className={itemClass(overflowActive)}
            >
              <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm tracking-tight">More</span>
            </button>
          )}
        </div>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
        description="The rest of your navigation"
        icon={<MoreHorizontal className="w-4 h-4" aria-hidden="true" />}
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
                      : 'text-muted-foreground font-medium hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
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
