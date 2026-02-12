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
 * Supports filtering by archived status
 */
export function useSharedSessions(): UseSessionsResult & { 
  archiveSession: (id: string) => Promise<void>;
  unarchiveSession: (id: string) => Promise<void>;
  activeSessions: Session[];
  archivedSessions: Session[];
} {
  const result = useSessions();
  
  const sharedSessions = result.sessions.filter(
    s => s.share_link_created || s.pdf_exported
  );

  const activeSessions = sharedSessions.filter(s => !s.archived);
  const archivedSessions = sharedSessions.filter(s => s.archived);

  // Auto-archive reports older than 90 days
  useEffect(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const staleReports = activeSessions.filter(s => {
      const updated = new Date(s.updated_at);
      return updated < ninetyDaysAgo && !s.archived;
    });

    if (staleReports.length > 0) {
      staleReports.forEach(async (s) => {
        await result.upsertSession({
          ...s,
          archived: true,
          archived_at: new Date().toISOString(),
        } as Session);
      });
    }
  }, [activeSessions.length]); // Only run when active count changes

  const archiveSession = useCallback(async (id: string) => {
    const session = result.sessions.find(s => s.id === id);
    if (session) {
      await result.upsertSession({ 
        ...session, 
        archived: true,
        archived_at: new Date().toISOString(),
      } as Session);
    }
  }, [result.sessions, result.upsertSession]);

  const unarchiveSession = useCallback(async (id: string) => {
    const session = result.sessions.find(s => s.id === id);
    if (session) {
      await result.upsertSession({ 
        ...session, 
        archived: false,
        archived_at: null,
      } as Session);
    }
  }, [result.sessions, result.upsertSession]);

  return {
    ...result,
    sessions: sharedSessions,
    activeSessions,
    archivedSessions,
    archiveSession,
    unarchiveSession,
  };
}
