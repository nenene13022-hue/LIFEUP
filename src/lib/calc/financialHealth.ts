import type { BalanceCheckin, Expense, FinancialProfile, Goal, Income } from "../types/models";
import { expensesInMonth, sumExpenses } from "./financialEngine";
import { estimateCurrentBalance } from "./insights";

export type HealthStatus = "good" | "caution" | "bad";

export interface FinancialHealthReport {
  netWorth: number;
  savingsRate: number; // 0-100, can be negative
  savingsRateStatus: HealthStatus;
  debtToIncome: number; // 0-100+
  debtToIncomeStatus: HealthStatus;
  emergencyFundMonths: number;
  emergencyFundStatus: HealthStatus;
  fixedExpenseRatio: number; // 0-100+
  fixedExpenseRatioStatus: HealthStatus;
  breakdown: {
    needs: number;
    wants: number;
    savings: number;
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
  };
}

export function calcFinancialHealth(
  profile: FinancialProfile,
  goals: Goal[],
  expenses: Expense[],
  income: Income[],
  checkins: BalanceCheckin[]
): FinancialHealthReport {
  const balance = estimateCurrentBalance(profile, checkins, income, expenses);
  const goalSavings = goals.filter((g) => g.status === "active").reduce((s, g) => s + g.currentAmount, 0);
  const netWorth = balance.amount + goalSavings - profile.currentDebt;

  const monthlyIncome = profile.monthlyIncome;
  const spentThisMonth = sumExpenses(expensesInMonth(expenses));
  const totalMonthlySpend = profile.fixedExpenses + spentThisMonth;

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - totalMonthlySpend) / monthlyIncome) * 100 : 0;
  const savingsRateStatus: HealthStatus = savingsRate >= 20 ? "good" : savingsRate >= 10 ? "caution" : "bad";

  const debtToIncome = monthlyIncome > 0 ? (profile.debtMonthlyPayment / monthlyIncome) * 100 : 0;
  const debtToIncomeStatus: HealthStatus = debtToIncome <= 36 ? "good" : debtToIncome <= 43 ? "caution" : "bad";

  const essentialMonthly = profile.fixedExpenses + profile.debtMonthlyPayment;
  const emergencyFundMonths = essentialMonthly > 0 ? balance.amount / essentialMonthly : balance.amount > 0 ? 99 : 0;
  const emergencyFundStatus: HealthStatus = emergencyFundMonths >= 3 ? "good" : emergencyFundMonths >= 1 ? "caution" : "bad";

  const fixedExpenseRatio = monthlyIncome > 0 ? (profile.fixedExpenses / monthlyIncome) * 100 : 0;
  const fixedExpenseRatioStatus: HealthStatus = fixedExpenseRatio <= 50 ? "good" : fixedExpenseRatio <= 65 ? "caution" : "bad";

  const needs = essentialMonthly;
  const wants = spentThisMonth;
  const savings = Math.max(monthlyIncome - needs - wants, 0);
  const denom = monthlyIncome > 0 ? monthlyIncome : 1;

  return {
    netWorth,
    savingsRate,
    savingsRateStatus,
    debtToIncome,
    debtToIncomeStatus,
    emergencyFundMonths,
    emergencyFundStatus,
    fixedExpenseRatio,
    fixedExpenseRatioStatus,
    breakdown: {
      needs,
      wants,
      savings,
      needsPct: (needs / denom) * 100,
      wantsPct: (wants / denom) * 100,
      savingsPct: (savings / denom) * 100,
    },
  };
}
