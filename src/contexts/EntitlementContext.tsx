import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ── Owner/admin emails — always have full access ──────────────────────────────
export const OWNER_EMAILS = [
  'craig219@comcast.net',
  'jason.craig@chinattirealty.com',
  'jdog45@gmail.com',
];

interface EntitlementState {
  isPro: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  isActive: boolean;
  expiresAt: string | null;
  betaActive: boolean;
  betaExpiresAt: string | null;
  betaExpired: boolean;
}

interface EntitlementContextType {
  entitlementState: EntitlementState;
  loading: boolean;
  canWrite: boolean;
  isReviewer: boolean;
  startCheckout: () => Promise<void>;
  manageSubscription: () => Promise<void>;
  refresh: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextType | undefined>(undefined);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const isOwner = !!user?.email && OWNER_EMAILS.some(e => e.toLowerCase() === user.email!.toLowerCase());

  // All logged-in users can write. Gate by subscription when billing is live.
  const canWrite = !!user;

  const state: EntitlementState = {
    isPro: isOwner,
    isTrial: false,
    trialEndsAt: null,
    isActive: !!user,
    expiresAt: null,
    betaActive: !!user,
    betaExpiresAt: null,
    betaExpired: false,
  };

  const refresh = useCallback(async () => { /* Stripe placeholder */ }, []);
  const startCheckout = useCallback(async () => {
    console.log('[Entitlement] Stripe checkout not configured yet');
  }, []);
  const manageSubscription = useCallback(async () => {
    console.log('[Entitlement] Stripe portal not configured yet');
  }, []);

  return (
    <EntitlementContext.Provider value={{
      entitlementState: state,
      loading: false,
      canWrite,
      isReviewer: false,
      startCheckout,
      manageSubscription,
      refresh,
    }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement() {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement must be used within EntitlementProvider');
  return ctx;
}
