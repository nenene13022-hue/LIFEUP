import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ScreenHeader, Card, EmptyState, Button } from "../../components/ui/primitives";
import { useApp } from "../../state/store";
import { CATEGORY_COLORS, expenseCategoryMeta } from "../../lib/constants";
import { formatCurrency, formatDate } from "../../lib/utils/format";
import { isThisMonth, isThisWeek, spendingByCategory, sumExpenses } from "../../lib/calc/financialEngine";

type Period = "today" | "week" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "היום" },
  { key: "week", label: "השבוע" },
  { key: "month", label: "החודש" },
  { key: "all", label: "הכל" },
];

export function ExpensesScreen() {
  const expenses = useApp((s) => s.expenses);
  const setQuickAddOpen = useApp((s) => s.setQuickAddOpen);
  const [period, setPeriod] = useState<Period>("month");

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return expenses.filter((e) => {
      if (period === "today") return e.date === today;
      if (period === "week") return isThisWeek(e.date);
      if (period === "month") return isThisMonth(e.date);
      return true;
    });
  }, [expenses, period]);

  const total = sumExpenses(filtered);
  const byCategory = spendingByCategory(filtered);
  const chartData = Object.entries(byCategory)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="pb-4">
      <ScreenHeader title="הוצאות" />

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={
              "tap-scale shrink-0 rounded-full px-4 py-2 text-sm font-medium border " +
              (period === p.key
                ? "bg-gradient-brand text-black border-transparent"
                : "bg-surface-2 text-text-secondary border-border")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card className="mb-4 animate-fade-in">
        <p className="text-text-secondary text-sm mb-1">סה״כ בתקופה</p>
        <p className="text-4xl font-extrabold">{formatCurrency(total)}</p>
      </Card>

      {chartData.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="עדיין אין כאן הוצאות"
          subtitle="כשתוסיף את ההוצאה הראשונה, נתחיל לזהות דפוסים."
          action={
            <Button className="w-full" onClick={() => setQuickAddOpen(true)}>
              הוסף הוצאה
            </Button>
          }
        />
      ) : (
        <>
          <Card className="mb-4 animate-fade-in">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {chartData.map((d) => (
                      <Cell key={d.key} fill={CATEGORY_COLORS[d.key as keyof typeof CATEGORY_COLORS]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="mb-4 animate-fade-in">
            <div className="flex flex-col gap-3">
              {chartData.map((d) => {
                const meta = expenseCategoryMeta(d.key as keyof typeof CATEGORY_COLORS);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.key} className="flex items-center gap-3">
                    <span className="text-lg">{meta.emoji}</span>
                    <span className="flex-1 text-sm">{meta.label}</span>
                    <span className="text-sm text-text-secondary">{pct}%</span>
                    <span className="text-sm font-semibold w-20 text-end">{formatCurrency(d.value)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <p className="text-text-secondary text-sm font-medium mb-2 mt-1">תנועות אחרונות</p>
          <div className="flex flex-col gap-2">
            {filtered.slice(0, 12).map((e) => {
              const meta = expenseCategoryMeta(e.category);
              return (
                <Card key={e.id} className="flex items-center gap-3 !p-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-lg">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.description || meta.label}</p>
                    <p className="text-xs text-text-muted">{formatDate(e.date)}</p>
                  </div>
                  <span className="font-semibold">{formatCurrency(e.amount)}</span>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
