import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "../../components/Logo";
import { Button } from "../../components/ui/primitives";
import { useApp } from "../../state/store";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const startDemo = useApp((s) => s.startDemo);
  const userId = useApp((s) => s.userId);
  const profile = useApp((s) => s.profile);

  useEffect(() => {
    if (userId && profile) {
      navigate("/home", { replace: true });
    }
  }, [userId, profile, navigate]);

  async function handleDemo() {
    await startDemo();
    navigate("/home");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-14 text-center">
      <div />
      <div className="flex flex-col items-center animate-fade-in">
        <div className="mb-8 drop-shadow-[0_0_40px_rgba(34,211,174,0.35)]">
          <LogoMark size={96} />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight mb-3">
          תגיד לי מה המטרה שלך
        </h1>
        <p className="text-text-secondary text-base mb-1">ואני אעזור לך להגיע אליה.</p>
      </div>

      <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
        <Button className="w-full" onClick={() => navigate("/signup")}>
          בוא נתחיל
          <ArrowLeft size={20} />
        </Button>
        <button onClick={handleDemo} className="text-text-muted text-sm underline tap-scale">
          רוצה רק להציץ? נסה משתמש דמו
        </button>
        <p className="text-text-muted text-xs mt-2">
          ניהול כסף חכם. מטרות ברורות. חיים פשוטים יותר.
        </p>
      </div>
    </div>
  );
}
