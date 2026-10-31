import type { ComponentType } from 'react';
import { Settings, Bell, Users, ArrowRightLeft, HardDrive } from 'lucide-react';

export type SystemConfigSection = 'general' | 'alerts' | 'users' | 'transfer' | 'backup';

export type SystemConfigSectionDef = {
  id: SystemConfigSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const SYSTEM_CONFIG_PATH = '/admin/settings';
export const DEFAULT_SYSTEM_CONFIG_SECTION: SystemConfigSection = 'general';

/** Single source of truth for the System Config sections. */
export const SYSTEM_CONFIG_SECTIONS: SystemConfigSectionDef[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  { id: 'backup', label: 'Backup', icon: HardDrive },
];

export function isSystemConfigPath(pathname: string): boolean {
  return (
    pathname === SYSTEM_CONFIG_PATH || pathname.startsWith(`${SYSTEM_CONFIG_PATH}/`)
  );
}

export function isSystemConfigSection(value: unknown): value is SystemConfigSection {
  return (
    typeof value === 'string' &&
    SYSTEM_CONFIG_SECTIONS.some((section) => section.id === value)
  );
}

/** Invalid or missing values fall back to General. */
export function parseSystemConfigSection(
  value: string | null | undefined,
): SystemConfigSection {
  return isSystemConfigSection(value) ? value : DEFAULT_SYSTEM_CONFIG_SECTION;
}

export function getSystemConfigHref(section: SystemConfigSection): string {
  return `${SYSTEM_CONFIG_PATH}?section=${section}`;
}

export function getSystemConfigLabel(section: SystemConfigSection): string {
  return (
    SYSTEM_CONFIG_SECTIONS.find((item) => item.id === section)?.label ?? 'General'
  );
}
