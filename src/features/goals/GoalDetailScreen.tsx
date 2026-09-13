import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, ProgressBar, Button, Field, inputClass, Badge } from "../../components/ui/primitives";
import { Sheet } from "../../components/ui/Sheet";
import { useApp } from "../../state/store";
import { calcGoalMath } from "../../lib/calc/financialEngine";
import { formatCurrency, formatDateFull } from "../../lib/utils/format";

export function GoalDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goals = useApp((s) => s.goals);
  const budget = useApp((s) => s.budget);
  const addMoney = useApp((s) => s.addMoney);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const goal = goals.find((g) => g.id === id);
  if (!goal) {
    return (
      <div className="pt-10 text-center text-text-secondary">
        היעד לא נמצא.
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/goals")}>
            חזרה ליעדים
          </Button>
        </div>
      </div>
    );
  }

  const gm = calcGoalMath(goal, budget?.monthlyDiscretionary ?? 0);

  async function submitAdd() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    const wasCompleted = goal!.status === "completed";
    await addMoney(goal!.id, value);
    setSaving(false);
    setSheetOpen(false);
    setAmount("");
    if (!wasCompleted && goal!.currentAmount + value >= goal!.targetAmount) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1600);
    }
  }

  return (
    <div className="pb-4 relative">
      <button onClick={() => navigate(-1)} className="tap-scale mb-4 flex items-center gap-1 text-text-secondary text-sm">
        <ArrowRight size={16} />
        חזרה
      </button>

      <div className="flex flex-col items-center text-center mb-6 animate-fade-in">
        <div className="text-5xl mb-2">{goal.emoji}</div>
        <h1 className="text-2xl font-bold">{goal.name}</h1>
        {goal.status === "completed" && <Badge tone="positive">הושלם 🏆</Badge>}
      </div>

      <Card className="mb-4 animate-fade-in">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-extrabold">{formatCurrency(goal.currentAmount)}</span>
          <span className="text-text-secondary text-sm">מתוך {formatCurrency(goal.targetAmount)}</span>
        </div>
        <ProgressBar pct={gm.progressPct} />
        <p className="text-xs text-text-muted mt-2">{gm.progressPct}% הושלם</p>
      </Card>

      <div className="flex flex-wrap gap-3 mb-4 [&>*]:basis-[calc(50%-0.375rem)] [&>*]:grow-0">
        <Card className="animate-fade-in">
          <p className="text-text-secondary text-xs mb-1">תאריך יעד</p>
          <p className="font-semibold text-sm">{formatDateFull(goal.targetDate)}</p>
        </Card>
        <Card className="animate-fade-in">
          <p className="text-text-secondary text-xs mb-1">נשארו</p>
          <p className="font-semibold text-sm">{gm.daysRemaining} ימים</p>
        </Card>
        <Card className="animate-fade-in">
          <p className="text-text-secondary text-xs mb-1">חיסכון שבועי נדרש</p>
          <p className="font-semibold text-sm">{formatCurrency(gm.requiredWeeklySaving)}</p>
        </Card>
        <Card className="animate-fade-in">
          <p className="text-text-secondary text-xs mb-1">חיסכון חודשי נדרש</p>
          <p className="font-semibold text-sm">{formatCurrency(gm.requiredMonthlySaving)}</p>
        </Card>
      </div>

      <Card className="mb-4 animate-fade-in">
        <p className="text-text-secondary text-xs mb-1">תחזית הגעה ליעד</p>
        <p className="font-semibold text-sm">
          {gm.projectedDate ? formatDateFull(gm.projectedDate) : "צריך עוד נתונים כדי לחשב תחזית"}
        </p>
        {!gm.isRealistic && goal.status === "active" && (
          <p className="text-warning text-xs mt-2">⚠️ בקצב הנוכחי היעד מעט אגרסיבי ביחס להכנסה הפנויה שלך.</p>
        )}
      </Card>

      {goal.status === "active" && (
        <Button className="w-full" onClick={() => setSheetOpen(true)}>
          הוסף כסף ליעד
        </Button>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="הוספת כסף ליעד">
        <Field label="סכום">
          <input className={inputClass} inputMode="decimal" placeholder="₪ 0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Button className="w-full" onClick={submitAdd} disabled={!amount || Number(amount) <= 0 || saving}>
          הוסף
        </Button>
      </Sheet>

      {celebrate && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="text-7xl animate-pop">🎉</div>
        </div>
      )}
    </div>
  );
}
