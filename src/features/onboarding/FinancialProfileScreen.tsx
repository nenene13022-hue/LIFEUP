import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader, Field, inputClass, Button } from "../../components/ui/primitives";
import { useApp } from "../../state/store";
import type { GoalCategory } from "../../lib/types/models";

export function FinancialProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const goalTypes: GoalCategory[] = (location.state as { goalTypes?: GoalCategory[] })?.goalTypes ?? [];
  const saveFinancialProfile = useApp((s) => s.saveFinancialProfile);

  const [income, setIncome] = useState("");
  const [fixed, setFixed] = useState("");
  const [savings, setSavings] = useState("");
  const [debt, setDebt] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await saveFinancialProfile({
      monthlyIncome: Number(income) || 0,
      fixedExpenses: Number(fixed) || 0,
      currentSavings: Number(savings) || 0,
      currentDebt: Number(debt) || 0,
      debtMonthlyPayment: 0,
    });
    setSaving(false);
    navigate("/onboarding/create-goal", { state: { goalTypes } });
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <ScreenHeader title="בואו נבין את המצב שלך" subtitle="לא חייבים מספר מדויק. הערכה מספיקה." />

      <Field label="הכנסה חודשית משוערת">
        <input className={inputClass} inputMode="decimal" placeholder="₪ 8,000" value={income} onChange={(e) => setIncome(e.target.value)} autoFocus />
      </Field>
      <Field label="הוצאות קבועות בחודש">
        <input className={inputClass} inputMode="decimal" placeholder="₪ 3,500" value={fixed} onChange={(e) => setFixed(e.target.value)} />
      </Field>
      <Field label="כמה כסף יש לך כרגע">
        <input className={inputClass} inputMode="decimal" placeholder="₪ 1,000" value={savings} onChange={(e) => setSavings(e.target.value)} />
      </Field>
      <Field label="חובות קיימים (אם יש)">
        <input className={inputClass} inputMode="decimal" placeholder="₪ 0" value={debt} onChange={(e) => setDebt(e.target.value)} />
      </Field>

      <div className="flex-1" />
      <Button className="w-full" onClick={submit} disabled={saving}>
        המשך
        <ArrowLeft size={20} />
      </Button>
    </div>
  );
}
