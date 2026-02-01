import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ViewMode = 'agent' | 'client';

interface ClientModeContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  isClientMode: boolean;
}

const ClientModeContext = createContext<ClientModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'reality_engine_view_mode';

export function ClientModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return stored === 'client' ? 'client' : 'agent';
  });

  const setMode = (newMode: ViewMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  };

  return (
    <ClientModeContext.Provider value={{ mode, setMode, isClientMode: mode === 'client' }}>
      {children}
    </ClientModeContext.Provider>
  );
}

export function useClientMode() {
  const context = useContext(ClientModeContext);
  if (!context) {
    throw new Error('useClientMode must be used within a ClientModeProvider');
  }
  return context;
}

// Force client mode for shared/exported views
export function ForceClientMode({ children }: { children: ReactNode }) {
  return (
    <ClientModeContext.Provider value={{ mode: 'client', setMode: () => {}, isClientMode: true }}>
      {children}
    </ClientModeContext.Provider>
  );
}
