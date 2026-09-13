import type { Expense, ExpenseCategory, Income } from "../types/models";
import { expenseCategoryMeta } from "../constants";

export interface TxItem {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  label: string;
  emoji: string;
}

export function mergeTransactions(expenses: Expense[], income: Income[]): TxItem[] {
  const items: TxItem[] = [
    ...expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      amount: e.amount,
      date: e.date,
      label: e.description || expenseCategoryMeta(e.category).label,
      emoji: expenseCategoryMeta(e.category).emoji,
    })),
    ...income.map((i) => ({
      id: i.id,
      type: "income" as const,
      amount: i.amount,
      date: i.date,
      label: i.source,
      emoji: "💵",
    })),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export interface PeriodSeriesPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dailySeries(expenses: Expense[], income: Income[], start: Date, end: Date): PeriodSeriesPoint[] {
  const points: PeriodSeriesPoint[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endIso = isoDate(end);
  while (isoDate(cursor) <= endIso) {
    const iso = isoDate(cursor);
    const dayIncome = income.filter((i) => i.date === iso).reduce((s, i) => s + i.amount, 0);
    const dayExpense = expenses.filter((e) => e.date === iso).reduce((s, e) => s + e.amount, 0);
    points.push({
      key: iso,
      label: String(cursor.getDate()),
      income: dayIncome,
      expense: dayExpense,
      net: dayIncome - dayExpense,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

const MONTH_LABELS = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];

export function monthlySeriesForYear(expenses: Expense[], income: Income[], year: number): PeriodSeriesPoint[] {
  const points: PeriodSeriesPoint[] = [];
  for (let m = 0; m < 12; m++) {
    const prefix = `${year}-${String(m + 1).padStart(2, "0")}`;
    const monthIncome = income.filter((i) => i.date.startsWith(prefix)).reduce((s, i) => s + i.amount, 0);
    const monthExpense = expenses.filter((e) => e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0);
    points.push({
      key: prefix,
      label: MONTH_LABELS[m],
      income: monthIncome,
      expense: monthExpense,
      net: monthIncome - monthExpense,
    });
  }
  return points;
}

export function categoryBreakdown(expenses: Expense[]): { category: ExpenseCategory; amount: number }[] {
  const map = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}
