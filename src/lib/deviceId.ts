// Device ID management for beta access
// Generates and persists a unique device identifier in localStorage

const DEVICE_ID_KEY = 'market_compass_device_id';

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}
