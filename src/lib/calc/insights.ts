import type { BalanceCheckin, Expense, ExpenseCategory, FinancialProfile, Goal, Income } from "../types/models";
import { calcBudgetSummary, daysBetween, daysInMonth, sumExpenses, toDate } from "./financialEngine";

// ---------- budget streak ----------
// Consecutive days (ending yesterday — today is still in progress) where total
// spending stayed within a flat daily share of that day's monthly discretionary
// budget. Bounded by `sinceDate` so days before the user had any financial
// profile don't count as free wins.
export function calcBudgetStreak(
  profile: FinancialProfile,
  goals: Goal[],
  expenses: Expense[],
  sinceDate: string,
  today = new Date()
): number {
  const monthlyDiscretionary = calcBudgetSummary(profile, goals, expenses).monthlyDiscretionary;
  if (monthlyDiscretionary <= 0) return 0;

  const byDate = new Map<string, number>();
  for (const e of expenses) {
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount);
  }

  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1); // start from yesterday; today isn't finished yet

  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (iso < sinceDate) break;
    const flatDaily = monthlyDiscretionary / daysInMonth(cursor);
    const spent = byDate.get(iso) ?? 0;
    if (spent > flatDaily) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---------- recurring expense (subscription) detection ----------
export interface RecurringCandidate {
  key: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  occurrences: number;
  lastDate: string;
}

export function detectRecurringExpenses(expenses: Expense[]): RecurringCandidate[] {
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const desc = (e.description ?? "").trim();
    if (!desc) continue;
    const key = `${e.category}::${desc.toLowerCase()}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }

  const results: RecurringCandidate[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));

    const amounts = sorted.map((e) => e.amount);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avg <= 0) continue;
    const amountsConsistent = amounts.every((a) => Math.abs(a - avg) / avg <= 0.15);
    if (!amountsConsistent) continue;

    const distinctMonths = new Set(sorted.map((e) => e.date.slice(0, 7)));
    if (distinctMonths.size < 2) continue;

    let cadenceConsistent = true;
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(toDate(sorted[i - 1].date), toDate(sorted[i].date));
      if (gap < 18 || gap > 45) cadenceConsistent = false;
    }
    if (!cadenceConsistent) continue;

    results.push({
      key,
      description: sorted[sorted.length - 1].description!.trim(),
      category: sorted[0].category,
      amount: Math.round(avg),
      occurrences: sorted.length,
      lastDate: sorted[sorted.length - 1].date,
    });
  }

  return results.sort((a, b) => b.occurrences - a.occurrences);
}

const DISMISSED_KEY = "lifeup-dismissed-subscriptions";

export function getDismissedSubscriptionKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function dismissSubscription(key: string) {
  const current = getDismissedSubscriptionKeys();
  if (!current.includes(key)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, key]));
  }
}

// ---------- balance estimate & cash flow forecast ----------
export interface BalanceEstimate {
  amount: number;
  sourceCheckinDate: string | null;
}

export function estimateCurrentBalance(
  profile: FinancialProfile,
  checkins: BalanceCheckin[],
  income: Income[],
  expenses: Expense[]
): BalanceEstimate {
  const sortedCheckins = [...checkins].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sortedCheckins[0];
  const baselineAmount = latest ? latest.balance : profile.currentSavings;
  const baselineDate = latest ? latest.date : "0000-00-00";

  const incomeSince = income.filter((i) => i.date > baselineDate).reduce((s, i) => s + i.amount, 0);
  const netSince = incomeSince - sumExpenses(expenses.filter((e) => e.date > baselineDate));

  return {
    amount: baselineAmount + netSince,
    sourceCheckinDate: latest ? latest.date : null,
  };
}

export interface CashFlowForecast {
  dailyBurn: number;
  projectedIn30Days: number;
}

export function forecastCashFlow(currentEstimate: number, expenses: Expense[], today = new Date()): CashFlowForecast {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);

  const recent = expenses.filter((e) => e.date >= cutoffIso && e.date <= todayIso);
  const earliestDate = recent.reduce((min, e) => (e.date < min ? e.date : min), todayIso);
  const spanDays = Math.max(daysBetween(toDate(earliestDate), today), 1);

  const dailyBurn = sumExpenses(recent) / spanDays;
  return {
    dailyBurn,
    projectedIn30Days: currentEstimate - dailyBurn * 30,
  };
}
