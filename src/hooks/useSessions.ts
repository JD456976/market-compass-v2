import { useState, useEffect, useCallback } from 'react';
import { Session } from '@/types';
import { 
  loadSessionsAsync, 
  upsertSessionAsync,
  deleteSessionAsync,
  loadSessions as loadSessionsSync 
} from '@/lib/storage';
import { createShareLink } from '@/lib/supabaseStorage';

interface UseSessionsResult {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upsertSession: (session: Session) => Promise<Session | null>;
  deleteSession: (id: string) => Promise<boolean>;
  createShareLink: (sessionId: string) => Promise<string | null>;
}

/**
 * Hook to manage all sessions from Supabase with localStorage fallback
 */
export function useSessions(): UseSessionsResult {
  // Start with localStorage data for immediate render
  const [sessions, setSessions] = useState<Session[]>(() => loadSessionsSync());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await loadSessionsAsync();
      setSessions(loaded);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
      // Keep localStorage data as fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const upsert = useCallback(async (session: Session): Promise<Session | null> => {
    const result = await upsertSessionAsync(session);
    if (result) {
      await loadSessions(); // Refresh list
    }
    return result;
  }, [loadSessions]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteSessionAsync(id);
    if (success) {
      await loadSessions(); // Refresh list
    }
    return success;
  }, [loadSessions]);

  const share = useCallback(async (sessionId: string): Promise<string | null> => {
    const token = await createShareLink(sessionId);
    if (token) {
      await loadSessions(); // Refresh list
    }
    return token;
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions,
    upsertSession: upsert,
    deleteSession: remove,
    createShareLink: share,
  };
}

/**
 * Hook to get only draft sessions (not shared/exported)
 */
export function useDraftSessions(): UseSessionsResult {
  const result = useSessions();
  
  const draftSessions = result.sessions.filter(
    s => !s.share_link_created && !s.pdf_exported
  );

  return {
    ...result,
    sessions: draftSessions,
  };
}

/**
 * Hook to get only shared sessions (shared or exported)
 */
export function useSharedSessions(): UseSessionsResult {
  const result = useSessions();
  
  const sharedSessions = result.sessions.filter(
    s => s.share_link_created || s.pdf_exported
  );

  return {
    ...result,
    sessions: sharedSessions,
  };
}
