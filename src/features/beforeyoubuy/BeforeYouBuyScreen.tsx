import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, Field, inputClass, Button, Card, Badge } from "../../components/ui/primitives";
import { useApp } from "../../state/store";
import { calcGoalMath, evaluatePurchase, type BeforeYouBuyResult } from "../../lib/calc/financialEngine";
import { formatCurrency } from "../../lib/utils/format";

const ALTERNATIVES_TIPS = [
  "לבדוק אם יש את זה יד שנייה או מחודש, במחיר נמוך יותר.",
  "לחכות למבצע או לעונת הנחות הקרובה.",
  "לבדוק חלופה דומה וזולה יותר באותה קטגוריה.",
];

export function BeforeYouBuyScreen() {
  const navigate = useNavigate();
  const itemLabelDefault = "";
  const [item, setItem] = useState(itemLabelDefault);
  const [price, setPrice] = useState("");
  const [result, setResult] = useState<BeforeYouBuyResult | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const budget = useApp((s) => s.budget);
  const goals = useApp((s) => s.goals);
  const addNewExpense = useApp((s) => s.addNewExpense);

  const nearestGoal = useMemo(() => {
    const active = goals.filter((g) => g.status === "active");
    if (active.length === 0) return null;
    return [...active].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
  }, [goals]);

  function check() {
    const value = Number(price);
    if (!value || value <= 0 || !budget) return;
    const goalMath = nearestGoal ? calcGoalMath(nearestGoal, budget.monthlyDiscretionary) : null;
    setResult(evaluatePurchase(value, budget, nearestGoal, goalMath));
    setShowAlternatives(false);
  }

  async function buyAnyway() {
    const value = Number(price);
    if (!value) return;
    await addNewExpense({ amount: value, category: "shopping", date: new Date().toISOString().slice(0, 10), description: item || undefined });
    navigate("/expenses");
  }

  const verdictTone: "positive" | "warning" | "negative" =
    result?.verdict === "green" ? "positive" : result?.verdict === "yellow" ? "warning" : "negative";
  const verdictEmoji = result?.verdict === "green" ? "🟢" : result?.verdict === "yellow" ? "🟡" : "🔴";

  return (
    <div className="pb-4">
      <ScreenHeader title="לפני שאני קונה" subtitle="נבדוק ביחד אם זה מסתדר עם התקציב והיעדים שלך." />

      <Field label="מה אתה רוצה לקנות?">
        <input className={inputClass} placeholder="לדוגמה: AirPods" value={item} onChange={(e) => setItem(e.target.value)} />
      </Field>
      <Field label="מחיר">
        <input className={inputClass} inputMode="decimal" placeholder="₪ 0" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>

      <Button className="w-full mb-4" onClick={check} disabled={!price || Number(price) <= 0}>
        בדוק
      </Button>

      {result && (
        <Card className="animate-fade-in">
          <Badge tone={verdictTone}>
            {verdictEmoji} {result.verdict === "green" ? "אפשרי" : result.verdict === "yellow" ? "אפשרי, אבל שים לב" : "לא מומלץ כרגע"}
          </Badge>
          <p className="text-sm mt-3 leading-relaxed">{result.message}</p>
          <p className="text-xs text-text-muted mt-2">
            יישאר לך {formatCurrency(Math.max(result.remainingAfter, 0))} פנויים החודש אחרי הרכישה.
          </p>

          <div className="flex flex-col gap-2 mt-4">
            <Button variant={result.verdict === "red" ? "secondary" : "primary"} className="w-full" onClick={buyAnyway}>
              קנה בכל זאת
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setResult(null)}>
              אחכה עם זה
            </Button>
            <button
              className="text-text-secondary text-sm underline tap-scale mt-1"
              onClick={() => setShowAlternatives((v) => !v)}
            >
              תראה לי חלופות
            </button>
          </div>

          {showAlternatives && (
            <div className="mt-3 pt-3 border-t border-border flex flex-col gap-1.5">
              {ALTERNATIVES_TIPS.map((t) => (
                <p key={t} className="text-xs text-text-secondary">
                  • {t}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
