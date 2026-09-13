import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { ScreenHeader, Card, EmptyState, Button } from "../../components/ui/primitives";
import { useApp } from "../../state/store";
import { CATEGORY_COLORS, POSITIVE_COLOR, NEGATIVE_COLOR, expenseCategoryMeta } from "../../lib/constants";
import { formatCurrency, formatDate } from "../../lib/utils/format";
import { isThisMonth, isThisWeek, startOfMonth, endOfMonth } from "../../lib/calc/financialEngine";
import { mergeTransactions, dailySeries, monthlySeriesForYear, categoryBreakdown, type PeriodSeriesPoint } from "../../lib/calc/transactions";

type Period = "day" | "week" | "month" | "year";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "היום" },
  { key: "week", label: "השבוע" },
  { key: "month", label: "החודש" },
  { key: "year", label: "השנה" },
];

function weekRange(ref = new Date()): [Date, Date] {
  const start = new Date(ref);
  start.setDate(ref.getDate() - ref.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [start, end];
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs shadow-card">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export function ExpensesScreen() {
  const expenses = useApp((s) => s.expenses);
  const income = useApp((s) => s.income);
  const setQuickAddOpen = useApp((s) => s.setQuickAddOpen);
  const [period, setPeriod] = useState<Period>("month");

  const now = new Date();
  const year = now.getFullYear();

  const { periodExpenses, periodIncome } = useMemo(() => {
    const today = now.toISOString().slice(0, 10);
    if (period === "day") {
      return { periodExpenses: expenses.filter((e) => e.date === today), periodIncome: income.filter((i) => i.date === today) };
    }
    if (period === "week") {
      return { periodExpenses: expenses.filter((e) => isThisWeek(e.date)), periodIncome: income.filter((i) => isThisWeek(i.date)) };
    }
    if (period === "month") {
      return { periodExpenses: expenses.filter((e) => isThisMonth(e.date)), periodIncome: income.filter((i) => isThisMonth(i.date)) };
    }
    return {
      periodExpenses: expenses.filter((e) => e.date.startsWith(String(year))),
      periodIncome: income.filter((i) => i.date.startsWith(String(year))),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, income, period]);

  const chartSeries: PeriodSeriesPoint[] = useMemo(() => {
    if (period === "week") {
      const [start, end] = weekRange(now);
      return dailySeries(expenses, income, start, end);
    }
    if (period === "month") {
      return dailySeries(expenses, income, startOfMonth(now), endOfMonth(now));
    }
    if (period === "year") {
      return monthlySeriesForYear(expenses, income, year);
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, income, period]);

  const totalExpense = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = periodIncome.reduce((s, i) => s + i.amount, 0);
  const net = totalIncome - totalExpense;

  const chartData = categoryBreakdown(periodExpenses);
  const transactions = useMemo(() => mergeTransactions(periodExpenses, periodIncome), [periodExpenses, periodIncome]);

  const hasAnyData = transactions.length > 0;

  return (
    <div className="pb-4">
      <ScreenHeader title="תנועות" />

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

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <Card className="animate-fade-in !p-3 text-center">
          <p className="text-text-secondary text-xs mb-1">הכנסות</p>
          <p className="text-lg font-bold text-positive">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="animate-fade-in !p-3 text-center">
          <p className="text-text-secondary text-xs mb-1">הוצאות</p>
          <p className="text-lg font-bold text-negative">{formatCurrency(totalExpense)}</p>
        </Card>
        <Card className="animate-fade-in !p-3 text-center">
          <p className="text-text-secondary text-xs mb-1">נטו</p>
          <p className={`text-lg font-bold ${net >= 0 ? "text-positive" : "text-negative"}`}>{formatCurrency(net)}</p>
        </Card>
      </div>

      {!hasAnyData ? (
        <EmptyState
          emoji="🧾"
          title="עדיין אין כאן תנועות"
          subtitle="כשתוסיף הוצאה או הכנסה, נתחיל לזהות דפוסים."
          action={
            <Button className="w-full" onClick={() => setQuickAddOpen(true)}>
              הוסף תנועה
            </Button>
          }
        />
      ) : (
        <>
          {chartSeries.length > 0 && (
            <Card className="mb-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">{period === "year" ? "מגמה שנתית" : "מגמה חודשית"}</p>
                <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: POSITIVE_COLOR }} />
                    עודף
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: NEGATIVE_COLOR }} />
                    גירעון
                  </span>
                </div>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      interval={period === "month" ? 3 : 0}
                    />
                    <YAxis hide />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="net" name="נטו" radius={[4, 4, 4, 4]}>
                      {chartSeries.map((d) => (
                        <Cell key={d.key} fill={d.net >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {chartData.length > 0 && (
            <Card className="mb-4 animate-fade-in">
              <p className="font-semibold text-sm mb-3">הוצאות לפי קטגוריה</p>
              <div className="h-40 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="amount" nameKey="category" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {chartData.map((d) => (
                        <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5">
                {chartData.map((d) => {
                  const meta = expenseCategoryMeta(d.category);
                  const pct = totalExpense > 0 ? Math.round((d.amount / totalExpense) * 100) : 0;
                  return (
                    <div key={d.category} className="flex items-center gap-3">
                      <span className="text-lg">{meta.emoji}</span>
                      <span className="flex-1 text-sm">{meta.label}</span>
                      <span className="text-sm text-text-secondary">{pct}%</span>
                      <span className="text-sm font-semibold w-20 text-end">{formatCurrency(d.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <p className="text-text-secondary text-sm font-medium mb-2 mt-1">תנועות אחרונות</p>
          <div className="flex flex-col gap-2">
            {transactions.slice(0, 20).map((t) => (
              <Card key={`${t.type}-${t.id}`} className="flex items-center gap-3 !p-3">
                <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-lg shrink-0">
                  {t.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.label}</p>
                  <p className="text-xs text-text-muted">{formatDate(t.date)}</p>
                </div>
                <span className={`font-semibold ${t.type === "income" ? "text-positive" : "text-negative"}`}>
                  {t.type === "income" ? "+" : "−"}
                  {formatCurrency(t.amount)}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
