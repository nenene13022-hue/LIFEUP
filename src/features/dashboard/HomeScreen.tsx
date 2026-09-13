import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, ShoppingBag, ChevronLeft } from "lucide-react";
import { Card, ProgressBar, Button, EmptyState, Badge } from "../../components/ui/primitives";
import { Sheet } from "../../components/ui/Sheet";
import { useApp } from "../../state/store";
import { calcGoalMath } from "../../lib/calc/financialEngine";
import { getHomeInsight } from "../../lib/ai/lifeupAI";
import { formatCurrency, formatDate } from "../../lib/utils/format";

export function HomeScreen() {
  const navigate = useNavigate();
  const user = useApp((s) => s.user);
  const profile = useApp((s) => s.profile);
  const goals = useApp((s) => s.goals);
  const expenses = useApp((s) => s.expenses);
  const budget = useApp((s) => s.budget);
  const notifications = useApp((s) => s.notifications);
  const markAllNotificationsRead = useApp((s) => s.markAllNotificationsRead);
  const [notifOpen, setNotifOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const unreadCount = notifications.filter((n) => !n.read).length;

  const nearestGoal = useMemo(() => {
    const active = goals.filter((g) => g.status === "active");
    if (active.length === 0) return null;
    return [...active].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
  }, [goals]);

  const goalMath = useMemo(() => {
    if (!nearestGoal || !budget) return null;
    return calcGoalMath(nearestGoal, budget.monthlyDiscretionary);
  }, [nearestGoal, budget]);

  const insight = useMemo(
    () => getHomeInsight({ profile: profile ?? undefined, goals, expenses }),
    [profile, goals, expenses]
  );

  const statusLabel =
    budget?.status === "on_track"
      ? { text: "אתה במסלול 👍", tone: "positive" as const }
      : budget?.status === "caution"
      ? { text: "שים לב — אתה מתקרב לתקרת התקציב.", tone: "warning" as const }
      : { text: "חרגת מהתקציב המתוכנן החודש.", tone: "negative" as const };

  const todayTasks = [
    goalMath && goalMath.requiredDailySaving > 1
      ? { id: "save", label: `להפריש ${formatCurrency(goalMath.requiredDailySaving)} לחיסכון` }
      : null,
    nearestGoal ? { id: "check", label: "לבדוק את היעד שלך" } : null,
    budget && budget.status !== "on_track" ? { id: "slow", label: "לצמצם קצת בהוצאות היום" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  if (!profile) {
    return (
      <div className="pt-6">
        <p className="text-text-secondary">טוען...</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <p className="text-text-secondary text-sm">שלום 👋</p>
          <h1 className="text-xl font-bold">{user?.name || "שלך"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotifOpen(true)}
            className="relative w-11 h-11 rounded-full bg-surface-2 border border-border flex items-center justify-center tap-scale"
            aria-label="התראות"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-negative text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="w-11 h-11 rounded-full bg-surface-2 border border-border flex items-center justify-center tap-scale"
            aria-label="הגדרות"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>

      <Card className="mb-4 relative overflow-hidden animate-fade-in">
        <div className="absolute inset-0 opacity-10 bg-gradient-brand" />
        <p className="text-text-secondary text-sm mb-1">כמה מותר לי להוציא היום?</p>
        <p className="text-5xl font-extrabold tracking-tight mb-2">
          {formatCurrency(budget?.dailyLimit ?? 0)}
        </p>
        <Badge tone={statusLabel.tone}>{statusLabel.text}</Badge>
      </Card>

      {nearestGoal && goalMath ? (
        <Card className="mb-4 animate-fade-in tap-scale" onClick={() => navigate(`/goals/${nearestGoal.id}`)}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold flex items-center gap-2">
              <span>{nearestGoal.emoji}</span>
              <span>{nearestGoal.name}</span>
            </span>
            <span className="text-sm text-text-secondary">
              {formatCurrency(nearestGoal.currentAmount)} / {formatCurrency(nearestGoal.targetAmount)}
            </span>
          </div>
          <ProgressBar pct={goalMath.progressPct} />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-text-muted">{goalMath.progressPct}%</span>
            <span className="text-xs text-text-secondary">נשארו {formatCurrency(goalMath.amountRemaining)}</span>
          </div>
        </Card>
      ) : (
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
      )}

      {todayTasks.length > 0 && (
        <Card className="mb-4 animate-fade-in">
          <p className="font-semibold mb-3">מה חשוב היום</p>
          <div className="flex flex-col gap-2.5">
            {todayTasks.map((t) => (
              <label key={t.id} className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!checked[t.id]}
                  onChange={() => setChecked((p) => ({ ...p, [t.id]: !p[t.id] }))}
                  className="w-5 h-5 accent-[color:var(--color-brand-from)] rounded"
                />
                <span className={checked[t.id] ? "line-through text-text-muted" : ""}>{t.label}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-4 animate-fade-in">
        <p className="font-semibold mb-2 flex items-center gap-2">
          <span>🤖</span>
          <span>LIFEUP אומר:</span>
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">{insight}</p>
      </Card>

      <button
        onClick={() => navigate("/before-you-buy")}
        className="tap-scale w-full flex items-center gap-3 bg-surface-2 border border-border rounded-xl3 p-4 mb-4"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-brand text-black flex items-center justify-center shrink-0">
          <ShoppingBag size={18} />
        </div>
        <span className="flex-1 text-start text-sm font-semibold">לפני שאני קונה</span>
        <ChevronLeft size={16} className="text-text-muted" />
      </button>

      <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} title="התראות">
        {notifications.length === 0 ? (
          <p className="text-text-secondary text-sm py-6 text-center">אין עדיין התראות.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((n) => (
              <div key={n.id} className="bg-surface-2 rounded-2xl p-3.5 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{n.title}</span>
                  <span className="text-[11px] text-text-muted">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-xs text-text-secondary">{n.message}</p>
              </div>
            ))}
            <Button variant="secondary" className="w-full mt-1" onClick={markAllNotificationsRead}>
              סמן הכל כנקרא
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
