import { useState, useEffect, useCallback } from 'react';
import { Session, MarketProfile } from '@/types';
import { 
  getSessionByIdAsync, 
  getMarketProfileByIdAsync 
} from '@/lib/storage';
import { 
  getSessionByShareToken,
  getSessionByIdFromSupabase,
  getMarketProfileByIdFromSupabase,
  ReportError 
} from '@/lib/supabaseStorage';

interface UseSessionResult {
  session: Session | null;
  marketProfile: MarketProfile | undefined;
  loading: boolean;
  error: ReportError | null;
  updateSession: (session: Session) => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Hook to load a session by ID from Supabase with localStorage fallback
 */
export function useSession(sessionId: string | undefined): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [marketProfile, setMarketProfile] = useState<MarketProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReportError | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      setError({ type: 'not_found', message: 'No session ID provided' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedSession = await getSessionByIdAsync(sessionId);
      
      if (!loadedSession) {
        setError({ type: 'not_found', message: 'Session not found' });
        setSession(null);
        return;
      }

      setSession(loadedSession);

      // Load market profile if referenced
      if (loadedSession.selected_market_profile_id) {
        const profile = await getMarketProfileByIdAsync(loadedSession.selected_market_profile_id);
        setMarketProfile(profile || undefined);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError({ type: 'unknown', message: 'Failed to load session' });
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const updateSession = useCallback(async (updatedSession: Session) => {
    const { upsertSessionAsync } = await import('@/lib/storage');
    const result = await upsertSessionAsync(updatedSession);
    if (result) {
      setSession(result);
    }
  }, []);

  return {
    session,
    marketProfile,
    loading,
    error,
    updateSession,
    refreshSession: loadSession,
  };
}

/**
 * Hook to load a session by share token from Supabase
 * Falls back to loading by ID for legacy share links
 */
export function useSharedSession(shareTokenOrId: string | undefined): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [marketProfile, setMarketProfile] = useState<MarketProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReportError | null>(null);

  const loadSession = useCallback(async () => {
    if (!shareTokenOrId) {
      setLoading(false);
      setError({ type: 'not_found', message: 'No share token provided' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try loading by share token first
      let loadedSession = await getSessionByShareToken(shareTokenOrId);
      
      // Fallback: try loading by ID (for legacy links)
      if (!loadedSession) {
        loadedSession = await getSessionByIdFromSupabase(shareTokenOrId);
      }
      
      // Final fallback: try localStorage via async helper
      if (!loadedSession) {
        loadedSession = await getSessionByIdAsync(shareTokenOrId);
      }
      
      if (!loadedSession) {
        setError({ type: 'not_found', message: 'Report not found' });
        setSession(null);
        return;
      }

      setSession(loadedSession);

      // Load market profile if referenced
      if (loadedSession.selected_market_profile_id) {
        let profile = await getMarketProfileByIdFromSupabase(loadedSession.selected_market_profile_id);
        if (!profile) {
          profile = await getMarketProfileByIdAsync(loadedSession.selected_market_profile_id);
        }
        setMarketProfile(profile || undefined);
      }
    } catch (err) {
      console.error('Error loading shared session:', err);
      setError({ type: 'unknown', message: 'Failed to load report' });
    } finally {
      setLoading(false);
    }
  }, [shareTokenOrId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const updateSession = useCallback(async (updatedSession: Session) => {
    const { upsertSessionAsync } = await import('@/lib/storage');
    const result = await upsertSessionAsync(updatedSession);
    if (result) {
      setSession(result);
    }
  }, []);

  return {
    session,
    marketProfile,
    loading,
    error,
    updateSession,
    refreshSession: loadSession,
  };
}
