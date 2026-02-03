import { MarketProfile, Session } from '@/types';
import { 
  loadSessionsFromSupabase, 
  getSessionByIdFromSupabase, 
  upsertSessionToSupabase, 
  deleteSessionFromSupabase,
  loadMarketProfilesFromSupabase,
  getMarketProfileByIdFromSupabase,
  upsertMarketProfileToSupabase,
  deleteMarketProfileFromSupabase
} from './supabaseStorage';

const SESSIONS_KEY = 'reality_engine_sessions';
const MARKET_PROFILES_KEY = 'reality_engine_market_profiles';

// Safe JSON parse with fallback to empty array
function safeParseArray<T>(data: string | null): T[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================
// SESSIONS - Hybrid (localStorage + Supabase)
// ============================================

// Synchronous load from localStorage (for initial render)
export function loadSessions(): Session[] {
  return safeParseArray<Session>(localStorage.getItem(SESSIONS_KEY));
}

// Async load from Supabase (preferred for cross-device)
export async function loadSessionsAsync(): Promise<Session[]> {
  try {
    const supabaseSessions = await loadSessionsFromSupabase();
    // Cache in localStorage for offline access
    if (supabaseSessions.length > 0) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(supabaseSessions));
    }
    return supabaseSessions;
  } catch (error) {
    console.error('Failed to load from Supabase, falling back to localStorage:', error);
    return loadSessions();
  }
}

// Upsert to both localStorage and Supabase
export function upsertSession(session: Session): void {
  const sessions = loadSessions();
  const now = new Date().toISOString();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  const sessionToSave: Session = {
    ...session,
    created_at: existingIndex >= 0 ? sessions[existingIndex].created_at : (session.created_at || now),
    updated_at: now,
  };
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = sessionToSave;
  } else {
    sessions.push(sessionToSave);
  }
  
  // Immediate localStorage save
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  
  // Async Supabase save (fire-and-forget for now)
  upsertSessionToSupabase(sessionToSave).catch(err => {
    console.error('Failed to sync session to Supabase:', err);
  });
}

// Async upsert that waits for Supabase
export async function upsertSessionAsync(session: Session): Promise<Session | null> {
  const now = new Date().toISOString();
  const existingLocal = loadSessions().find(s => s.id === session.id);
  
  const sessionToSave: Session = {
    ...session,
    created_at: existingLocal?.created_at || session.created_at || now,
    updated_at: now,
  };
  
  // Save to Supabase first
  const result = await upsertSessionToSupabase(sessionToSave);
  
  // Update localStorage cache
  if (result) {
    const sessions = loadSessions();
    const existingIndex = sessions.findIndex(s => s.id === result.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = result;
    } else {
      sessions.push(result);
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }
  
  return result;
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter(s => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  
  // Async Supabase delete
  deleteSessionFromSupabase(id).catch(err => {
    console.error('Failed to delete session from Supabase:', err);
  });
}

export async function deleteSessionAsync(id: string): Promise<boolean> {
  const success = await deleteSessionFromSupabase(id);
  if (success) {
    const sessions = loadSessions().filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }
  return success;
}

// Get session - try Supabase first, fall back to localStorage
export function getSessionById(id: string): Session | undefined {
  return loadSessions().find(s => s.id === id);
}

export async function getSessionByIdAsync(id: string): Promise<Session | null> {
  try {
    const session = await getSessionByIdFromSupabase(id);
    if (session) {
      // Update localStorage cache
      const sessions = loadSessions();
      const existingIndex = sessions.findIndex(s => s.id === id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      return session;
    }
    // Fall back to localStorage
    return loadSessions().find(s => s.id === id) || null;
  } catch (error) {
    console.error('Failed to get session from Supabase:', error);
    return loadSessions().find(s => s.id === id) || null;
  }
}

// ============================================
// MARKET PROFILES - Hybrid (localStorage + Supabase)
// ============================================

export function loadMarketProfiles(): MarketProfile[] {
  return safeParseArray<MarketProfile>(localStorage.getItem(MARKET_PROFILES_KEY));
}

export async function loadMarketProfilesAsync(): Promise<MarketProfile[]> {
  try {
    const profiles = await loadMarketProfilesFromSupabase();
    if (profiles.length > 0) {
      localStorage.setItem(MARKET_PROFILES_KEY, JSON.stringify(profiles));
    }
    return profiles;
  } catch (error) {
    console.error('Failed to load profiles from Supabase:', error);
    return loadMarketProfiles();
  }
}

export function upsertMarketProfile(profile: MarketProfile): void {
  const profiles = loadMarketProfiles();
  const now = new Date().toISOString();
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  
  const profileToSave: MarketProfile = {
    ...profile,
    updated_at: now,
  };
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = profileToSave;
  } else {
    profiles.push(profileToSave);
  }
  
  localStorage.setItem(MARKET_PROFILES_KEY, JSON.stringify(profiles));
  
  upsertMarketProfileToSupabase(profileToSave).catch(err => {
    console.error('Failed to sync profile to Supabase:', err);
  });
}

export function deleteMarketProfile(id: string): void {
  const profiles = loadMarketProfiles().filter(p => p.id !== id);
  localStorage.setItem(MARKET_PROFILES_KEY, JSON.stringify(profiles));
  
  deleteMarketProfileFromSupabase(id).catch(err => {
    console.error('Failed to delete profile from Supabase:', err);
  });
}

export function getMarketProfileById(id: string): MarketProfile | undefined {
  return loadMarketProfiles().find(p => p.id === id);
}

export async function getMarketProfileByIdAsync(id: string): Promise<MarketProfile | null> {
  try {
    const profile = await getMarketProfileByIdFromSupabase(id);
    if (profile) {
      const profiles = loadMarketProfiles();
      const existingIndex = profiles.findIndex(p => p.id === id);
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }
      localStorage.setItem(MARKET_PROFILES_KEY, JSON.stringify(profiles));
      return profile;
    }
    return loadMarketProfiles().find(p => p.id === id) || null;
  } catch (error) {
    console.error('Failed to get profile from Supabase:', error);
    return loadMarketProfiles().find(p => p.id === id) || null;
  }
}

// ============================================
// UUID generator
// ============================================
export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// Legacy aliases for backward compatibility
// ============================================
export const getSessions = loadSessions;
export const saveSession = upsertSession;
export const getMarketProfiles = loadMarketProfiles;
export const saveMarketProfile = upsertMarketProfile;
