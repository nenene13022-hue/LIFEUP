import type { Expense, FinancialProfile, Goal } from "../types/models";
import { calcBudgetSummary, calcGoalMath, spendingByCategory, expensesInMonth } from "../calc/financialEngine";
import { expenseCategoryMeta } from "../constants";
import { formatCurrency } from "../utils/format";
import type { AgentResponse } from "./agentTools";
import { getStoredApiKey } from "./apiKeyStore";

export function buildAgentContext(profile: FinancialProfile | null, goals: Goal[], expenses: Expense[]): string {
  if (!profile) {
    return "למשתמש עדיין אין פרופיל פיננסי מלא (הכנסה/הוצאות קבועות לא הוזנו).";
  }
  const budget = calcBudgetSummary(profile, goals, expenses);
  const activeGoals = goals.filter((g) => g.status === "active");
  const lines: string[] = [];

  lines.push(`הכנסה חודשית: ${formatCurrency(profile.monthlyIncome)}`);
  lines.push(`הוצאות קבועות בחודש: ${formatCurrency(profile.fixedExpenses)}`);
  lines.push(`תקציב פנוי להוצאה החודש: ${formatCurrency(budget.monthlyDiscretionary)}`);
  lines.push(`הוצאות בפועל החודש עד עכשיו: ${formatCurrency(budget.spentThisMonth)}`);
  lines.push(`נשאר פנוי החודש: ${formatCurrency(budget.remainingThisMonth)}`);
  lines.push(`מותר להוציא היום (לפי הקצב): ${formatCurrency(budget.dailyLimit)}`);
  lines.push(`סטטוס תקציב: ${budget.status}`);

  if (activeGoals.length > 0) {
    lines.push("יעדים פעילים:");
    for (const g of activeGoals) {
      const gm = calcGoalMath(g, budget.monthlyDiscretionary);
      lines.push(
        `- "${g.name}" (id: ${g.id}): ${formatCurrency(g.currentAmount)} מתוך ${formatCurrency(g.targetAmount)}, ${gm.progressPct}%, יעד לתאריך ${g.targetDate}`
      );
    }
  } else {
    lines.push("אין למשתמש יעדים פעילים כרגע.");
  }

  const monthExpenses = expensesInMonth(expenses);
  const byCategory = spendingByCategory(monthExpenses);
  const catLines = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, amount]) => `${expenseCategoryMeta(key as Expense["category"]).label}: ${formatCurrency(amount)}`);
  if (catLines.length) {
    lines.push("הוצאות החודש לפי קטגוריה: " + catLines.join(", "));
  }

  const recent = expenses.slice(0, 10).map((e) => `${e.date}: ${formatCurrency(e.amount)} ${expenseCategoryMeta(e.category).label}${e.description ? " (" + e.description + ")" : ""}`);
  if (recent.length) {
    lines.push("10 ההוצאות האחרונות:\n" + recent.join("\n"));
  }

  return lines.join("\n");
}

export interface AgentTurnHistory {
  role: "user" | "model";
  text: string;
}

export async function callAgent(
  message: string,
  context: string,
  history: AgentTurnHistory[] = []
): Promise<AgentResponse> {
  const today = new Date().toISOString().slice(0, 10);
  const apiKey = getStoredApiKey() ?? undefined;
  const res = await fetch("/api/ai-agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, today, context, history, apiKey }),
  });

  if (!res.ok) {
    let errMsg = "משהו השתבש. נסה שוב.";
    try {
      const data = await res.json();
      if (data?.error) errMsg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(errMsg);
  }

  return (await res.json()) as AgentResponse;
}
