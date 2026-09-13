import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ScreenHeader, Card, ProgressBar, EmptyState, Button } from "../../components/ui/primitives";
import { useApp } from "../../state/store";
import { calcGoalMath } from "../../lib/calc/financialEngine";
import { formatCurrency } from "../../lib/utils/format";

export function GoalsScreen() {
  const navigate = useNavigate();
  const goals = useApp((s) => s.goals);
  const budget = useApp((s) => s.budget);

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-5">
        <ScreenHeader title="היעדים שלי" />
        <button
          onClick={() => navigate("/goals/new")}
          className="tap-scale w-11 h-11 rounded-full bg-gradient-brand text-black flex items-center justify-center -mt-5"
          aria-label="הוסף יעד"
        >
          <Plus size={22} />
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="אין לך עדיין יעד"
          subtitle="כדאי להתחיל ממשהו אחד שאתה באמת רוצה להשיג."
          action={
            <Button className="w-full" onClick={() => navigate("/goals/new")}>
              צור יעד ראשון
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((g, i) => {
            const gm = calcGoalMath(g, budget?.monthlyDiscretionary ?? 0);
            return (
              <Card
                key={g.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
                onClick={() => navigate(`/goals/${g.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center gap-2">
                    <span>{g.emoji}</span>
                    <span>{g.name}</span>
                  </span>
                  <span className="text-sm text-text-secondary">
                    {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                  </span>
                </div>
                <ProgressBar pct={gm.progressPct} />
                <p className="text-xs text-text-muted mt-2">{gm.progressPct}%</p>
              </Card>
            );
          })}

          {completed.length > 0 && (
            <>
              <p className="text-text-secondary text-sm font-medium mt-3 mb-1">הושלמו 🏆</p>
              {completed.map((g) => (
                <Card key={g.id} className="opacity-70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-2">
                      <span>{g.emoji}</span>
                      <span>{g.name}</span>
                    </span>
                    <span className="text-sm text-positive font-medium">הושלם ✓</span>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
