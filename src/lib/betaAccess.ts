// Beta access session management
// Uses localStorage to persist access state between sessions

const ACCESS_KEY = 'market_compass_access';
const DEVICE_ID_KEY = 'market_compass_device_id';
const OWNER_DEVICE_KEY = 'market_compass_owner_device';
const OWNER_DEVICE_ID_KEY = 'market_compass_owner_device_id';

export interface BetaAccessSession {
  email: string;
  activatedAt: string;
  deviceId: string;
  role: 'admin' | 'beta';
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

export function getBetaAccessSession(): BetaAccessSession | null {
  const stored = localStorage.getItem(ACCESS_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as BetaAccessSession;
  } catch {
    return null;
  }
}

export function setBetaAccessSession(session: BetaAccessSession): void {
  localStorage.setItem(ACCESS_KEY, JSON.stringify(session));
}

export function clearBetaAccessSession(): void {
  localStorage.removeItem(ACCESS_KEY);
}

export function hasValidBetaAccess(): boolean {
  return getBetaAccessSession() !== null;
}

export function isAdminSession(): boolean {
  const session = getBetaAccessSession();
  return session?.role === 'admin';
}

// Generate a code hash using SHA-256 (for client-side hashing before sending to server)
export async function hashCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a readable access code (8 chars, uppercase, no confusing chars)
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0,O,I,1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// Owner device management
export function isOwnerDevice(): boolean {
  return localStorage.getItem(OWNER_DEVICE_KEY) === 'true';
}

export function getOwnerDeviceId(): string | null {
  return localStorage.getItem(OWNER_DEVICE_ID_KEY);
}

export function setOwnerDevice(deviceId: string): void {
  localStorage.setItem(OWNER_DEVICE_KEY, 'true');
  localStorage.setItem(OWNER_DEVICE_ID_KEY, deviceId);
}

export function clearOwnerDevice(): void {
  localStorage.removeItem(OWNER_DEVICE_KEY);
  localStorage.removeItem(OWNER_DEVICE_ID_KEY);
}
