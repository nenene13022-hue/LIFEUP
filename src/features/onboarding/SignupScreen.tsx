import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button, Field, inputClass, ScreenHeader } from "../../components/ui/primitives";
import { LogoMark } from "../../components/Logo";
import { useApp } from "../../state/store";
import { loadGoogleScript, decodeGoogleCredential, getGoogleClientId } from "../../lib/auth/googleAuth";

export function SignupScreen() {
  const navigate = useNavigate();
  const signup = useApp((s) => s.signup);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const clientId = getGoogleClientId();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function completeSignup(signupName: string, signupEmail: string) {
    setLoading(true);
    await signup(signupName, signupEmail);
    setLoading(false);
    navigate("/onboarding/goals");
  }

  useEffect(() => {
    if (!clientId || !googleButtonRef.current) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            const profile = decodeGoogleCredential(response.credential);
            completeSignup(profile.name, profile.email);
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "signup_with",
          locale: "he",
          width: 320,
        });
      })
      .catch(() => setGoogleError("לא ניתן לטעון את ההתחברות עם Google כרגע."));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function submit() {
    if (!emailValid) return;
    await completeSignup(name, email);
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="flex justify-center mb-8">
        <LogoMark size={56} />
      </div>
      <ScreenHeader title="נכיר אותך קצת" subtitle="בלי בירוקרטיה. רק מה שבאמת נחוץ." />

      <div className="flex flex-col gap-3 mb-6">
        {clientId ? (
          <div className="flex justify-center min-h-[44px]">
            <div ref={googleButtonRef} />
            {googleError && <p className="text-negative text-xs mt-2">{googleError}</p>}
          </div>
        ) : (
          <button className="tap-scale h-14 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-2 opacity-60 relative">
            <span>הרשמה עם Google</span>
            <span className="absolute left-4 text-xs bg-black/10 rounded-full px-2 py-0.5">בקרוב</span>
          </button>
        )}
        <button className="tap-scale h-14 rounded-2xl bg-black border border-border text-white font-semibold flex items-center justify-center gap-2 opacity-60 relative">
          <span> הרשמה עם Apple</span>
          <span className="absolute left-4 text-xs bg-white/10 rounded-full px-2 py-0.5">בקרוב</span>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-px bg-border flex-1" />
        <span className="text-text-muted text-xs">או עם אימייל</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <Field label="שם פרטי">
        <input className={inputClass} placeholder="איך נקרא לך?" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="אימייל">
        <div className="relative">
          <input
            className={inputClass}
            style={{ paddingInlineEnd: "2.75rem" }}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <Mail size={18} className="absolute top-1/2 -translate-y-1/2 end-4 text-text-muted" />
        </div>
      </Field>

      <div className="flex-1" />
      <Button className="w-full mt-6" onClick={submit} disabled={!emailValid || loading}>
        המשך
      </Button>
    </div>
  );
}
