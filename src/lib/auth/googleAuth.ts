// Minimal wrapper around Google Identity Services (GIS) — the current official
// "Sign in with Google" library. No backend involved: we decode the returned ID
// token client-side just to read the name/email and pre-fill a LOCAL profile
// (this app has no server-side accounts). That means the token's signature is
// never cryptographically verified — acceptable here since nothing security
// sensitive depends on it, but this is NOT a substitute for real server-side
// authentication if this app ever grows a backend with real user accounts.

export interface GoogleProfile {
  name: string;
  email: string;
  picture?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("נכשלה טעינת שירות ההתחברות של Google."));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function decodeGoogleCredential(jwt: string): GoogleProfile {
  const payloadSegment = jwt.split(".")[1];
  const payload = JSON.parse(base64UrlDecode(payloadSegment));
  return {
    name: payload.name ?? payload.email?.split("@")[0] ?? "משתמש Google",
    email: payload.email,
    picture: payload.picture,
  };
}

export function getGoogleClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}
