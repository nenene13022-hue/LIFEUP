import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { ScreenHeader, Field, inputClass, Button } from "../../components/ui/primitives";
import { useApp } from "../../state/store";

export function ProfileScreen() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const saveFinancialProfile = useApp((s) => s.saveFinancialProfile);

  const [income, setIncome] = useState(String(profile?.monthlyIncome ?? ""));
  const [fixed, setFixed] = useState(String(profile?.fixedExpenses ?? ""));
  const [savings, setSavings] = useState(String(profile?.currentSavings ?? ""));
  const [debt, setDebt] = useState(String(profile?.currentDebt ?? ""));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await saveFinancialProfile({
      monthlyIncome: Number(income) || 0,
      fixedExpenses: Number(fixed) || 0,
      currentSavings: Number(savings) || 0,
      currentDebt: Number(debt) || 0,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="pb-4">
      <button onClick={() => navigate(-1)} className="tap-scale mb-4 flex items-center gap-1 text-text-secondary text-sm">
        <ArrowRight size={16} />
        חזרה
      </button>
      <ScreenHeader title="הגדרות פיננסיות" subtitle="אפשר לעדכן בכל זמן — לא חייבים דיוק מוחלט." />

      <Field label="הכנסה חודשית משוערת">
        <input className={inputClass} inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} />
      </Field>
      <Field label="הוצאות קבועות בחודש">
        <input className={inputClass} inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} />
      </Field>
      <Field label="כמה כסף יש לך כרגע">
        <input className={inputClass} inputMode="decimal" value={savings} onChange={(e) => setSavings(e.target.value)} />
      </Field>
      <Field label="חובות קיימים">
        <input className={inputClass} inputMode="decimal" value={debt} onChange={(e) => setDebt(e.target.value)} />
      </Field>

      <Button className="w-full mt-2" onClick={submit} disabled={saving}>
        {saved ? (
          <>
            <Check size={18} /> נשמר
          </>
        ) : (
          "שמור שינויים"
        )}
      </Button>
    </div>
  );
}
