const STORAGE_KEY = "lifeup-gemini-api-key";

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    /* ignore — private browsing / storage disabled */
  }
}

export function clearStoredApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function maskApiKey(key: string): string {
  if (key.length <= 6) return "•".repeat(key.length);
  return "•".repeat(Math.max(key.length - 4, 4)) + key.slice(-4);
}
