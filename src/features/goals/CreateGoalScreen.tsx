import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader, Field, inputClass, Button, Chip, Card } from "../../components/ui/primitives";
import { GOAL_CATEGORIES, goalCategoryMeta } from "../../lib/constants";
import { useApp } from "../../state/store";
import { calcGoalMath } from "../../lib/calc/financialEngine";
import { formatCurrency } from "../../lib/utils/format";
import type { GoalCategory } from "../../lib/types/models";

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function CreateGoalScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnboarding = location.pathname.startsWith("/onboarding");
  const preselected: GoalCategory[] = (location.state as { goalTypes?: GoalCategory[] })?.goalTypes ?? [];

  const profile = useApp((s) => s.profile);
  const goals = useApp((s) => s.goals);
  const addNewGoal = useApp((s) => s.addNewGoal);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<GoalCategory>(preselected[0] ?? "other");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState(inDays(90));
  const [saving, setSaving] = useState(false);

  const availableMonthlyForGoals = useMemo(() => {
    if (!profile) return 0;
    const otherGoalsMonthly = goals
      .filter((g) => g.status === "active")
      .reduce((sum, g) => sum + calcGoalMath(g, Number.POSITIVE_INFINITY).requiredMonthlySaving, 0);
    return Math.max(profile.monthlyIncome - profile.fixedExpenses - profile.debtMonthlyPayment - otherGoalsMonthly, 0);
  }, [profile, goals]);

  const preview = useMemo(() => {
    const target = Number(targetAmount) || 0;
    const current = Number(currentAmount) || 0;
    if (target <= 0) return null;
    return calcGoalMath(
      {
        id: "preview",
        userId: "",
        name,
        targetAmount: target,
        currentAmount: current,
        targetDate,
        category,
        emoji: goalCategoryMeta(category).emoji,
        createdAt: new Date().toISOString(),
        status: "active",
      },
      availableMonthlyForGoals
    );
  }, [targetAmount, currentAmount, targetDate, category, name, availableMonthlyForGoals]);

  const valid = name.trim().length > 0 && Number(targetAmount) > 0 && targetDate >= inDays(1);

  async function submit() {
    if (!valid) return;
    setSaving(true);
    await addNewGoal({
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      targetDate,
      category,
      emoji: goalCategoryMeta(category).emoji,
    });
    setSaving(false);
    navigate(isOnboarding ? "/home" : "/goals");
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <ScreenHeader title="מה אתה רוצה להשיג?" />

      <Field label="שם היעד">
        <input className={inputClass} placeholder="לדוגמה: חופשה ביוון" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>

      <Field label="קטגוריה">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {GOAL_CATEGORIES.map((c) => (
            <Chip key={c.key} selected={category === c.key} onClick={() => setCategory(c.key)} className="shrink-0 flex items-center gap-1.5">
              <span>{c.emoji}</span>
              <span className="whitespace-nowrap">{c.label}</span>
            </Chip>
          ))}
        </div>
      </Field>

      <div className="flex gap-3 [&>label]:flex-1 [&>label]:min-w-0">
        <Field label="סכום יעד">
          <input className={inputClass} inputMode="decimal" placeholder="₪ 5,000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
        </Field>
        <Field label="כבר נחסך">
          <input className={inputClass} inputMode="decimal" placeholder="₪ 0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
        </Field>
      </div>

      <Field label="תאריך יעד">
        <input type="date" className={inputClass} value={targetDate} min={inDays(1)} onChange={(e) => setTargetDate(e.target.value)} />
      </Field>

      {preview && (
        <Card className="mt-2 mb-4 animate-fade-in">
          <p className="text-sm text-text-secondary mb-1">נשארו לך {formatCurrency(preview.amountRemaining)}</p>
          <p className="text-sm text-text-secondary mb-1">
            עד לתאריך היעד נשארו {Math.round(preview.weeksRemaining)} שבועות
          </p>
          <p className="text-sm font-semibold mb-2">
            אתה צריך לחסוך כ-{formatCurrency(preview.requiredWeeklySaving)} בשבוע
          </p>
          {!preview.isRealistic && (
            <div className="mt-2 pt-3 border-t border-border">
              <p className="text-warning text-sm font-medium mb-2">⚠️ כרגע היעד מעט אגרסיבי.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="tap-scale text-xs bg-surface-2 border border-border rounded-xl px-3 py-2"
                  onClick={() => setTargetDate((d) => {
                    const nd = new Date(d);
                    nd.setDate(nd.getDate() + 30);
                    return nd.toISOString().slice(0, 10);
                  })}
                >
                  לדחות תאריך ב-30 יום
                </button>
                <button
                  className="tap-scale text-xs bg-surface-2 border border-border rounded-xl px-3 py-2"
                  onClick={() => setTargetAmount((a) => String(Math.round((Number(a) || 0) * 0.8)))}
                >
                  להקטין יעד ב-20%
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="flex-1" />
      <Button className="w-full" onClick={submit} disabled={!valid || saving}>
        צור יעד
        <ArrowLeft size={20} />
      </Button>
      {isOnboarding && (
        <button
          onClick={() => navigate("/home")}
          className="tap-scale text-text-muted text-sm underline mt-4 mx-auto"
        >
          דלג בינתיים
        </button>
      )}
    </div>
  );
}
