import type { Expense, ExpenseCategory, Goal, Income } from "../types/models";
import { expenseCategoryMeta } from "../constants";
import { sumExpenses } from "../calc/financialEngine";

export interface CategoryBreakdownItem {
  category: ExpenseCategory;
  label: string;
  emoji: string;
  amount: number;
  pct: number;
}

export interface GoalSummaryItem {
  name: string;
  emoji: string;
  progressPct: number;
  currentAmount: number;
  targetAmount: number;
}

export interface MonthlyReportData {
  year: number;
  month: number; // 0-11
  monthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  categoryBreakdown: CategoryBreakdownItem[];
  goals: GoalSummaryItem[];
  topExpenses: Expense[];
  expenseCount: number;
}

export function listAvailableMonths(expenses: Expense[], income: Income[]): { year: number; month: number }[] {
  const keys = new Set<string>();
  for (const e of expenses) keys.add(e.date.slice(0, 7));
  for (const i of income) keys.add(i.date.slice(0, 7));
  const now = new Date();
  keys.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((k) => ({ year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)) - 1 }));
}

export function buildMonthlyReport(
  year: number,
  month: number,
  expenses: Expense[],
  income: Income[],
  goals: Goal[]
): MonthlyReportData {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthExpenses = expenses.filter((e) => e.date.startsWith(prefix));
  const monthIncome = income.filter((i) => i.date.startsWith(prefix));

  const totalExpenses = sumExpenses(monthExpenses);
  const totalIncome = monthIncome.reduce((s, i) => s + i.amount, 0);

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of monthExpenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryBreakdown: CategoryBreakdownItem[] = [...byCategory.entries()]
    .map(([category, amount]) => {
      const meta = expenseCategoryMeta(category);
      return { category, label: meta.label, emoji: meta.emoji, amount, pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0 };
    })
    .sort((a, b) => b.amount - a.amount);

  const goalsSummary: GoalSummaryItem[] = goals
    .filter((g) => g.status === "active")
    .map((g) => ({
      name: g.name,
      emoji: g.emoji,
      progressPct: g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0,
      currentAmount: g.currentAmount,
      targetAmount: g.targetAmount,
    }));

  const topExpenses = [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 8);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return {
    year,
    month,
    monthLabel,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    categoryBreakdown,
    goals: goalsSummary,
    topExpenses,
    expenseCount: monthExpenses.length,
  };
}
