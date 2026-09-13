import { useState } from "react";
import { LogoMark } from "../../components/Logo";
import { PinDots, PinKeypad } from "../../components/ui/PinKeypad";
import { verifyPin } from "../../lib/security/pinLock";

export function PinUnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function addDigit(d: string) {
    if (value.length >= 4 || error) return;
    const next = value + d;
    setValue(next);
    if (next.length === 4) {
      if (verifyPin(next)) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setError(false);
          setValue("");
        }, 500);
      }
    }
  }

  function backspace() {
    setValue((v) => v.slice(0, -1));
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 bg-bg">
      <div className="flex flex-col items-center gap-3">
        <LogoMark size={56} />
        <p className="text-text-secondary text-sm">{error ? "קוד שגוי, נסה שוב" : "הזן קוד נעילה"}</p>
      </div>
      <PinDots length={4} filled={value.length} error={error} />
      <PinKeypad onDigit={addDigit} onBackspace={backspace} />
    </div>
  );
}
