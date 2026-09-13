import type { Expense, Goal } from "../types/models";
import type { AddExpenseArgs, AddIncomeArgs, CreateGoalArgs, ToolCall } from "./agentTools";
import { expenseCategoryMeta, goalCategoryMeta, EXPENSE_CATEGORIES, GOAL_CATEGORIES } from "../constants";
import { formatCurrency, formatDate } from "../utils/format";

export type AgentPlan =
  | { kind: "execute_expense"; args: AddExpenseArgs; summary: string }
  | { kind: "execute_income"; args: AddIncomeArgs; summary: string }
  | { kind: "execute_goal"; args: CreateGoalArgs; summary: string }
  | { kind: "execute_add_to_goal"; goalId: string; goalName: string; amount: number; summary: string }
  | { kind: "confirm_delete_expense"; expenseId: string; summary: string }
  | { kind: "pick_goal"; amount: number; options: Array<{ id: string; label: string }> }
  | { kind: "pick_expense"; options: Array<{ id: string; label: string }> }
  | { kind: "error"; message: string };

function normalizeDate(date: string | undefined, today: string): string {
  if (!date) return today;
  const trimmed = date.trim().toLowerCase();
  if (trimmed === "today" || trimmed === "היום") return today;
  if (trimmed === "yesterday" || trimmed === "אתמול") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return today;
  return d.toISOString().slice(0, 10);
}

function normalizeExpenseCategory(v: string | undefined): AddExpenseArgs["category"] {
  const found = EXPENSE_CATEGORIES.find((c) => c.key === v);
  return (found?.key ?? "other") as AddExpenseArgs["category"];
}

function normalizeGoalCategory(v: string | undefined): CreateGoalArgs["category"] {
  const found = GOAL_CATEGORIES.find((c) => c.key === v);
  return (found?.key ?? "other") as CreateGoalArgs["category"];
}

function fuzzyMatchGoals(name: string, goals: Goal[]): Goal[] {
  const norm = name.trim().toLowerCase();
  if (!norm) return [];
  const active = goals.filter((g) => g.status === "active");
  const exact = active.filter((g) => g.name.trim().toLowerCase() === norm);
  if (exact.length) return exact;
  return active.filter((g) => g.name.toLowerCase().includes(norm) || norm.includes(g.name.toLowerCase()));
}

function matchExpenses(
  args: { matchDescription?: string; matchAmount?: number; matchDate?: string },
  expenses: Expense[]
): Expense[] {
  if (!args.matchAmount && !args.matchDate && !args.matchDescription) return [];
  let candidates = expenses;
  if (args.matchAmount) candidates = candidates.filter((e) => Math.abs(e.amount - args.matchAmount!) < 0.5);
  if (args.matchDate) candidates = candidates.filter((e) => e.date === args.matchDate);
  if (args.matchDescription) {
    const norm = args.matchDescription.trim().toLowerCase();
    candidates = candidates.filter((e) => (e.description ?? "").toLowerCase().includes(norm));
  }
  return candidates.slice(0, 8);
}

export function planToolCall(
  toolCall: ToolCall,
  ctx: { today: string; goals: Goal[]; expenses: Expense[] }
): AgentPlan {
  switch (toolCall.tool) {
    case "add_expense": {
      const amount = Number(toolCall.args.amount);
      if (!amount || amount <= 0) return { kind: "error", message: "לא הבנתי מה הסכום. תוכל לומר שוב?" };
      const date = normalizeDate(toolCall.args.date, ctx.today);
      const category = normalizeExpenseCategory(toolCall.args.category);
      const meta = expenseCategoryMeta(category);
      const args: AddExpenseArgs = { amount, category, date, description: toolCall.args.description };
      return {
        kind: "execute_expense",
        args,
        summary: `${meta.emoji} הוצאה ${formatCurrency(amount)} · ${meta.label} · ${formatDate(date)}`,
      };
    }

    case "add_income": {
      const amount = Number(toolCall.args.amount);
      if (!amount || amount <= 0) return { kind: "error", message: "לא הבנתי מה הסכום. תוכל לומר שוב?" };
      const date = normalizeDate(toolCall.args.date, ctx.today);
      const source = toolCall.args.source?.trim() || "הכנסה";
      return {
        kind: "execute_income",
        args: { amount, source, date },
        summary: `💰 הכנסה ${formatCurrency(amount)} · ${source} · ${formatDate(date)}`,
      };
    }

    case "create_goal": {
      const target = Number(toolCall.args.targetAmount);
      const name = toolCall.args.name?.trim();
      if (!target || target <= 0 || !name) {
        return { kind: "error", message: "חסר לי שם היעד או הסכום. תוכל לפרט שוב?" };
      }
      const category = normalizeGoalCategory(toolCall.args.category);
      const targetDate = normalizeDate(toolCall.args.targetDate, ctx.today);
      const currentAmount = Number(toolCall.args.currentAmount) || 0;
      const meta = goalCategoryMeta(category);
      return {
        kind: "execute_goal",
        args: { name, targetAmount: target, currentAmount, targetDate, category },
        summary: `${meta.emoji} יעד חדש: ${name} · ${formatCurrency(target)} עד ${formatDate(targetDate)}`,
      };
    }

    case "add_to_goal": {
      const amount = Number(toolCall.args.amount);
      if (!amount || amount <= 0) return { kind: "error", message: "לא הבנתי מה הסכום. תוכל לומר שוב?" };
      const matches = fuzzyMatchGoals(toolCall.args.goalName ?? "", ctx.goals);
      if (matches.length === 0) {
        return { kind: "error", message: `לא מצאתי יעד בשם "${toolCall.args.goalName}". איך היעד נקרא אצלך?` };
      }
      if (matches.length > 1) {
        return {
          kind: "pick_goal",
          amount,
          options: matches.map((g) => ({
            id: g.id,
            label: `${g.emoji} ${g.name} (${formatCurrency(g.currentAmount)}/${formatCurrency(g.targetAmount)})`,
          })),
        };
      }
      const goal = matches[0];
      return {
        kind: "execute_add_to_goal",
        goalId: goal.id,
        goalName: goal.name,
        amount,
        summary: `${goal.emoji} הוספת ${formatCurrency(amount)} ליעד "${goal.name}"`,
      };
    }

    case "delete_expense": {
      const matches = matchExpenses(toolCall.args, ctx.expenses);
      if (matches.length === 0) {
        return { kind: "error", message: "לא מצאתי הוצאה שמתאימה לתיאור הזה." };
      }
      if (matches.length > 1) {
        return {
          kind: "pick_expense",
          options: matches.map((e) => ({
            id: e.id,
            label: `${formatCurrency(e.amount)} · ${expenseCategoryMeta(e.category).label}${
              e.description ? " · " + e.description : ""
            } · ${formatDate(e.date)}`,
          })),
        };
      }
      const e = matches[0];
      return {
        kind: "confirm_delete_expense",
        expenseId: e.id,
        summary: `${formatCurrency(e.amount)} · ${expenseCategoryMeta(e.category).label} · ${formatDate(e.date)}`,
      };
    }
  }
}

export function describeExpenseForDeletion(expense: Expense): string {
  return `${formatCurrency(expense.amount)} · ${expenseCategoryMeta(expense.category).label}${
    expense.description ? " · " + expense.description : ""
  } · ${formatDate(expense.date)}`;
}
