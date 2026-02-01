import { MarketProfile, Session } from '@/types';

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

// Sessions
export function loadSessions(): Session[] {
  return safeParseArray<Session>(localStorage.getItem(SESSIONS_KEY));
}

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
  
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter(s => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSessionById(id: string): Session | undefined {
  return loadSessions().find(s => s.id === id);
}

// Market Profiles
export function loadMarketProfiles(): MarketProfile[] {
  return safeParseArray<MarketProfile>(localStorage.getItem(MARKET_PROFILES_KEY));
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
}

export function deleteMarketProfile(id: string): void {
  const profiles = loadMarketProfiles().filter(p => p.id !== id);
  localStorage.setItem(MARKET_PROFILES_KEY, JSON.stringify(profiles));
}

export function getMarketProfileById(id: string): MarketProfile | undefined {
  return loadMarketProfiles().find(p => p.id === id);
}

// UUID generator
export function generateId(): string {
  return crypto.randomUUID();
}

// Legacy aliases for backward compatibility
export const getSessions = loadSessions;
export const saveSession = upsertSession;
export const getMarketProfiles = loadMarketProfiles;
export const saveMarketProfile = upsertMarketProfile;
