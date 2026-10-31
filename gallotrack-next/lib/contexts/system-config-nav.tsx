'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_SYSTEM_CONFIG_SECTION,
  getSystemConfigHref,
  type SystemConfigSection,
} from '@/lib/system-config-nav';

type SystemConfigNavContextValue = {
  /** Section currently rendered by the System Config page. */
  activeSection: SystemConfigSection;
  setActiveSection: (section: SystemConfigSection) => void;
  /** True when the settings form has unsaved edits. */
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** The page supplies a callback that restores the last saved values. */
  setDiscardHandler: (handler: (() => void) | null) => void;
  /** Prompts for confirmation when dirty, then navigates. Returns true on navigation. */
  requestSection: (section: SystemConfigSection) => boolean;
};

const SystemConfigNavContext = createContext<SystemConfigNavContextValue | null>(
  null,
);

export function SystemConfigNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SystemConfigSection>(
    DEFAULT_SYSTEM_CONFIG_SECTION,
  );
  const [dirty, setDirty] = useState(false);
  const discardRef = useRef<(() => void) | null>(null);

  const setDiscardHandler = useCallback((handler: (() => void) | null) => {
    discardRef.current = handler;
  }, []);

  const requestSection = useCallback(
    (section: SystemConfigSection) => {
      if (section === activeSection) return false;

      if (dirty) {
        if (!window.confirm('Discard changes?')) return false;
        discardRef.current?.();
        setDirty(false);
      }

      setActiveSection(section);
      router.push(getSystemConfigHref(section));
      return true;
    },
    [activeSection, dirty, router],
  );

  const value = useMemo(
    () => ({
      activeSection,
      setActiveSection,
      dirty,
      setDirty,
      setDiscardHandler,
      requestSection,
    }),
    [activeSection, dirty, setDiscardHandler, requestSection],
  );

  return (
    <SystemConfigNavContext.Provider value={value}>
      {children}
    </SystemConfigNavContext.Provider>
  );
}

export function useSystemConfigNav(): SystemConfigNavContextValue {
  const context = useContext(SystemConfigNavContext);
  if (!context) {
    throw new Error(
      'useSystemConfigNav must be used within a SystemConfigNavProvider',
    );
  }
  return context;
}
