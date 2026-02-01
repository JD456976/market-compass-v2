import { MarketProfile, Session } from '@/types';

const SESSIONS_KEY = 'reality_engine_sessions';
const MARKET_PROFILES_KEY = 'reality_engine_market_profiles';

// Sessions
export function getSessions(): Session[] {
  const data = localStorage.getItem(SESSIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSession(session: Session): void {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = { ...session, updated_at: new Date().toISOString() };
  } else {
    sessions.push({ ...session, updated_at: new Date().toISOString() });
  }
  
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSessionById(id: string): Session | undefined {
  return getSessions().find(s => s.id === id);
}

// Market Profiles
export function getMarketProfiles(): MarketProfile[] {
  const data = localStorage.getItem(MARKET_PROFILES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveMarketProfile(profile: MarketProfile): void {
  const profiles = getMarketProfiles();
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = { ...profile, updated_at: new Date().toISOString() };
  } else {
    profiles.push({ ...profile, updated_at: new Date().toISOString() });
  }
  
  localStorage.setItem(MARKET_PROFILES_KEY, JSON.stringify(profiles));
}

export function deleteMarketProfile(id: string): void {
  const profiles = getMarketProfiles().filter(p => p.id !== id);
  localStorage.setItem(MARKET_PROFILES_KEY, JSON.stringify(profiles));
}

export function getMarketProfileById(id: string): MarketProfile | undefined {
  return getMarketProfiles().find(p => p.id === id);
}

// UUID generator
export function generateId(): string {
  return crypto.randomUUID();
}
