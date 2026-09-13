import type { Expense, FinancialProfile, Goal, BudgetStatus, ExpenseCategory } from "../types/models";

// ---------- date helpers ----------
export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
export function daysInMonth(d = new Date()): number {
  return endOfMonth(d).getDate();
}
export function dayOfMonth(d = new Date()): number {
  return d.getDate();
}
export function daysBetween(a: Date, b: Date): number {
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}
export function toDate(iso: string): Date {
  return new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
}
export function isThisMonth(iso: string, ref = new Date()): boolean {
  const d = toDate(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
export function isThisWeek(iso: string, ref = new Date()): boolean {
  const d = toDate(iso);
  const day = ref.getDay();
  const start = new Date(ref);
  start.setDate(ref.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

// ---------- goal math ----------
export interface GoalMath {
  amountRemaining: number;
  progressPct: number;
  daysRemaining: number;
  weeksRemaining: number;
  monthsRemaining: number;
  requiredDailySaving: number;
  requiredWeeklySaving: number;
  requiredMonthlySaving: number;
  isRealistic: boolean;
  projectedDate: string | null;
}

export function calcGoalMath(goal: Goal, availableMonthlyForGoals: number): GoalMath {
  const amountRemaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const progressPct = goal.targetAmount > 0
    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
    : 0;

  const today = new Date();
  const target = toDate(goal.targetDate);
  const daysRemaining = Math.max(daysBetween(new Date(today), new Date(target)), 0);
  const weeksRemaining = Math.max(daysRemaining / 7, 1 / 7);
  const monthsRemaining = Math.max(daysRemaining / 30.4, 1 / 30.4);

  const requiredDailySaving = daysRemaining > 0 ? amountRemaining / daysRemaining : amountRemaining;
  const requiredWeeklySaving = requiredDailySaving * 7;
  const requiredMonthlySaving = requiredDailySaving * 30.4;

  const isRealistic = amountRemaining === 0 || requiredMonthlySaving <= Math.max(availableMonthlyForGoals, 0) * 1.05;

  let projectedDate: string | null = null;
  if (availableMonthlyForGoals > 0 && amountRemaining > 0) {
    const monthsNeeded = amountRemaining / availableMonthlyForGoals;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(monthsNeeded * 30.4));
    projectedDate = d.toISOString().slice(0, 10);
  } else if (amountRemaining === 0) {
    projectedDate = new Date().toISOString().slice(0, 10);
  }

  return {
    amountRemaining,
    progressPct,
    daysRemaining,
    weeksRemaining,
    monthsRemaining,
    requiredDailySaving,
    requiredWeeklySaving,
    requiredMonthlySaving,
    isRealistic,
    projectedDate,
  };
}

// ---------- spending ----------
export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function expensesInMonth(expenses: Expense[], ref = new Date()): Expense[] {
  return expenses.filter((e) => isThisMonth(e.date, ref));
}

export function expensesInWeek(expenses: Expense[], ref = new Date()): Expense[] {
  return expenses.filter((e) => isThisWeek(e.date, ref));
}

export function spendingByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const map: Partial<Record<ExpenseCategory, number>> = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] ?? 0) + e.amount;
  }
  return map as Record<ExpenseCategory, number>;
}

// ---------- available money / budget ----------
export interface BudgetSummary {
  monthlyDiscretionary: number;
  totalRequiredMonthlySavings: number;
  spentThisMonth: number;
  remainingThisMonth: number;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  status: BudgetStatus;
  daysRemainingInMonth: number;
}

export function calcBudgetSummary(
  profile: FinancialProfile,
  goals: Goal[],
  allExpenses: Expense[]
): BudgetSummary {
  const activeGoals = goals.filter((g) => g.status === "active");
  const totalRequiredMonthlySavings = activeGoals.reduce((sum, g) => {
    const gm = calcGoalMath(g, Number.POSITIVE_INFINITY);
    return sum + gm.requiredMonthlySaving;
  }, 0);

  const monthlyDiscretionary = Math.max(
    profile.monthlyIncome - profile.fixedExpenses - profile.debtMonthlyPayment - totalRequiredMonthlySavings,
    0
  );

  const now = new Date();
  const dim = daysInMonth(now);
  const dom = dayOfMonth(now);
  const daysRemainingInMonth = Math.max(dim - dom + 1, 1);

  const spentThisMonth = sumExpenses(expensesInMonth(allExpenses, now));
  const remainingThisMonth = monthlyDiscretionary - spentThisMonth;
  const dailyLimit = Math.max(remainingThisMonth / daysRemainingInMonth, 0);
  const weeklyLimit = dailyLimit * 7;
  const monthlyLimit = monthlyDiscretionary;

  const proratedBudgetToDate = (monthlyDiscretionary / dim) * dom;
  const ratio = proratedBudgetToDate > 0 ? spentThisMonth / proratedBudgetToDate : spentThisMonth > 0 ? 2 : 0;

  let status: BudgetStatus = "on_track";
  if (ratio > 1.3) status = "over_budget";
  else if (ratio >= 0.95) status = "caution";

  return {
    monthlyDiscretionary,
    totalRequiredMonthlySavings,
    spentThisMonth,
    remainingThisMonth,
    dailyLimit: Math.round(dailyLimit),
    weeklyLimit: Math.round(weeklyLimit),
    monthlyLimit: Math.round(monthlyLimit),
    status,
    daysRemainingInMonth,
  };
}

// ---------- trends ----------
export interface SpendingTrend {
  text: string;
}

export function calcSpendingTrends(expenses: Expense[]): SpendingTrend[] {
  const trends: SpendingTrend[] = [];
  const weekday = expenses.filter((e) => {
    const d = toDate(e.date).getDay();
    return d !== 5 && d !== 6;
  });
  const weekend = expenses.filter((e) => {
    const d = toDate(e.date).getDay();
    return d === 5 || d === 6;
  });
  const weekdayAvg = weekday.length ? sumExpenses(weekday) / Math.max(new Set(weekday.map((e) => e.date)).size, 1) : 0;
  const weekendAvg = weekend.length ? sumExpenses(weekend) / Math.max(new Set(weekend.map((e) => e.date)).size, 1) : 0;

  if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.15) {
    const pct = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
    trends.push({ text: `אתה מוציא בממוצע ${pct}% יותר בסופי שבוע.` });
  }

  const byCat = spendingByCategory(expenses);
  const fun = byCat.fun ?? 0;
  const total = sumExpenses(expenses);
  if (total > 0 && fun / total > 0.28) {
    const pct = Math.round((fun / total) * 100);
    trends.push({ text: `${pct}% מההוצאות שלך החודש הן על בילויים.` });
  }

  return trends;
}

// ---------- before you buy ----------
export type BuyVerdict = "green" | "yellow" | "red";

export interface BeforeYouBuyResult {
  verdict: BuyVerdict;
  message: string;
  delayDays: number | null;
  remainingAfter: number;
}

export function evaluatePurchase(
  price: number,
  budget: BudgetSummary,
  nearestGoal: Goal | null,
  nearestGoalMath: GoalMath | null
): BeforeYouBuyResult {
  const remainingAfter = budget.remainingThisMonth - price;
  let delayDays: number | null = null;

  if (nearestGoal && nearestGoalMath && nearestGoalMath.requiredDailySaving > 0) {
    delayDays = Math.round(price / nearestGoalMath.requiredDailySaving);
  }

  if (price > budget.remainingThisMonth) {
    return {
      verdict: "red",
      message: `הרכישה הזו חורגת מהתקציב הפנוי שנשאר לך החודש (${Math.max(
        Math.round(budget.remainingThisMonth),
        0
      )} ₪).`,
      delayDays,
      remainingAfter,
    };
  }

  if (delayDays !== null && delayDays >= 3) {
    return {
      verdict: "yellow",
      message: `אפשרי, אבל שים לב — הרכישה תדחה את היעד "${nearestGoal?.name}" בכ-${delayDays} ימים.`,
      delayDays,
      remainingAfter,
    };
  }

  if (price > budget.remainingThisMonth * 0.5) {
    return {
      verdict: "yellow",
      message: "אפשרי, אבל זו נגיסה משמעותית בתקציב הפנוי החודש.",
      delayDays,
      remainingAfter,
    };
  }

  return {
    verdict: "green",
    message: "הרכישה הזו לא אמורה לפגוע ביעדים שלך.",
    delayDays,
    remainingAfter,
  };
}
