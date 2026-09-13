const PIN_KEY = "lifeup-app-pin";

export function hasPinSet(): boolean {
  try {
    return !!localStorage.getItem(PIN_KEY);
  } catch {
    return false;
  }
}

export function setPin(pin: string) {
  try {
    localStorage.setItem(PIN_KEY, pin);
  } catch {
    /* ignore */
  }
}

export function clearPin() {
  try {
    localStorage.removeItem(PIN_KEY);
  } catch {
    /* ignore */
  }
}

export function verifyPin(pin: string): boolean {
  try {
    return localStorage.getItem(PIN_KEY) === pin;
  } catch {
    return false;
  }
}
