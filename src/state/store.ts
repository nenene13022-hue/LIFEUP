import { create } from "zustand";
import type {
  User,
  FinancialProfile,
  Goal,
  Expense,
  Income,
  AppNotification,
  Achievement,
  AIConversation,
  BalanceCheckin,
  ExpenseCategory,
  GoalCategory,
} from "../lib/types/models";
import * as repo from "../lib/db/repositories";
import { seedDemoUser } from "../lib/db/seed";
import { calcBudgetSummary, type BudgetSummary } from "../lib/calc/financialEngine";
import { askLifeUp } from "../lib/ai/lifeupAI";
import { buildBackup, downloadJSON, parseBackupFile, restoreBackup as restoreBackupData, deleteAllUserData } from "../lib/db/backup";
import { exportToExcel, importFromExcel } from "../lib/excel";

export type LastAction =
  | { type: "expense"; expense: Expense }
  | { type: "income"; income: Income }
  | { type: "goal"; goal: Goal }
  | { type: "add_to_goal"; goalId: string; amount: number; goalName: string }
  | { type: "delete_expense"; expense: Expense };

interface AppState {
  ready: boolean;
  userId: string | null;
  user: User | null;
  profile: FinancialProfile | null;
  goals: Goal[];
  expenses: Expense[];
  income: Income[];
  notifications: AppNotification[];
  achievements: Achievement[];
  aiConversations: AIConversation[];
  balanceCheckins: BalanceCheckin[];
  budget: BudgetSummary | null;
  quickAddOpen: boolean;
  lastAction: LastAction | null;

  init: () => Promise<void>;
  loadAll: (userId: string) => Promise<void>;
  startDemo: () => Promise<void>;
  signup: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveFinancialProfile: (patch: Partial<FinancialProfile>) => Promise<void>;
  addNewGoal: (data: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    category: GoalCategory;
    emoji: string;
  }) => Promise<Goal>;
  addMoney: (goalId: string, amount: number) => Promise<void>;
  addNewExpense: (data: {
    amount: number;
    category: ExpenseCategory;
    date: string;
    description?: string;
  }) => Promise<Expense>;
  addNewIncome: (amount: number, source: string, date?: string) => Promise<Income>;
  deleteExpenseAction: (expenseId: string) => Promise<void>;
  undoLastAction: () => Promise<void>;
  setQuickAddOpen: (open: boolean) => void;
  markAllNotificationsRead: () => Promise<void>;
  sendAIMessage: (message: string) => Promise<void>;
  logAIConversation: (message: string, response: string) => Promise<void>;
  addBalanceCheckin: (balance: number, date?: string) => Promise<void>;
  exportBackup: () => Promise<void>;
  restoreFromBackupFile: (file: File) => Promise<void>;
  exportExcel: () => Promise<void>;
  importExcelFile: (file: File) => Promise<{ expensesAdded: number; incomeAdded: number }>;
  deleteAllData: () => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  userId: null,
  user: null,
  profile: null,
  goals: [],
  expenses: [],
  income: [],
  notifications: [],
  achievements: [],
  aiConversations: [],
  balanceCheckins: [],
  budget: null,
  quickAddOpen: false,
  lastAction: null,

  init: async () => {
    const userId = await repo.getSessionUserId();
    if (userId) {
      const user = await repo.getUser(userId);
      if (user) {
        await get().loadAll(userId);
        set({ ready: true });
        return;
      }
    }
    set({ ready: true });
  },

  loadAll: async (userId: string) => {
    const [user, profile, goals, expenses, income, notifications, achievements, aiConversations, balanceCheckins] =
      await Promise.all([
        repo.getUser(userId),
        repo.getFinancialProfile(userId),
        repo.getGoals(userId),
        repo.getExpenses(userId),
        repo.getIncomeList(userId),
        repo.getNotifications(userId),
        repo.getAchievements(userId),
        repo.getAIConversations(userId),
        repo.getBalanceCheckins(userId),
      ]);
    const budget = profile ? calcBudgetSummary(profile, goals, expenses) : null;
    set({
      userId,
      user: user ?? null,
      profile: profile ?? null,
      goals,
      expenses,
      income,
      notifications,
      achievements,
      aiConversations,
      balanceCheckins,
      budget,
    });
  },

  startDemo: async () => {
    const userId = await seedDemoUser();
    await get().loadAll(userId);
    set({ ready: true });
  },

  signup: async (name: string, email: string) => {
    const user = await repo.createUser({
      name: name || "משתמש חדש",
      email,
      currency: "ILS",
      language: "he",
      authProvider: "email",
    });
    await repo.setSession(user.id);
    await get().loadAll(user.id);
    set({ ready: true });
  },

  logout: async () => {
    await repo.clearSession();
    set({
      userId: null,
      user: null,
      profile: null,
      goals: [],
      expenses: [],
      income: [],
      notifications: [],
      achievements: [],
      aiConversations: [],
      balanceCheckins: [],
      budget: null,
    });
  },

  saveFinancialProfile: async (patch) => {
    const userId = get().userId;
    if (!userId) return;
    await repo.upsertFinancialProfile(userId, patch);
    await get().loadAll(userId);
  },

  addNewGoal: async (data) => {
    const userId = get().userId;
    if (!userId) throw new Error("no user");
    const goal = await repo.createGoal({ userId, ...data });
    await get().loadAll(userId);
    const goalsCount = get().goals.length;
    if (goalsCount === 1) {
      await repo.unlockAchievement(userId, "first_goal", "היעד הראשון שלך", "🎯");
    }
    set({ lastAction: { type: "goal", goal } });
    return goal;
  },

  addMoney: async (goalId, amount) => {
    const userId = get().userId;
    if (!userId) return;
    const goalBefore = get().goals.find((g) => g.id === goalId);
    const updated = await repo.addMoneyToGoal(goalId, amount);
    await repo.addNotification({
      userId,
      type: "success",
      title: "כל הכבוד! 🎯",
      message: `הוספת ${Math.round(amount).toLocaleString("he-IL")} ₪ ליעד שלך.`,
    });
    if (updated && updated.status === "completed") {
      await repo.unlockAchievement(userId, `goal_complete_${goalId}`, "הגעת ליעד!", "🏆");
    }
    await get().loadAll(userId);
    if (goalBefore) {
      set({ lastAction: { type: "add_to_goal", goalId, amount, goalName: goalBefore.name } });
    }
  },

  addNewExpense: async (data) => {
    const userId = get().userId;
    if (!userId) throw new Error("no user");
    const expense = await repo.addExpense({ userId, ...data });
    await get().loadAll(userId);

    const expenses = get().expenses;
    if (expenses.length === 1) {
      await repo.unlockAchievement(userId, "first_track", "התחלת לעקוב", "📊");
    }

    const budget = get().budget;
    if (budget && budget.status === "over_budget") {
      await repo.addNotification({
        userId,
        type: "warning",
        title: "⚠️ שים לב לתקציב",
        message: "אתה קרוב לחריגה מהתקציב החודשי. כדאי להאט קצת עם ההוצאות.",
      });
      await get().loadAll(userId);
    }
    set({ lastAction: { type: "expense", expense } });
    return expense;
  },

  addNewIncome: async (amount, source, date) => {
    const userId = get().userId;
    if (!userId) throw new Error("no user");
    const income = await repo.addIncome({ userId, amount, source, date: date ?? new Date().toISOString().slice(0, 10) });
    await get().loadAll(userId);
    set({ lastAction: { type: "income", income } });
    return income;
  },

  deleteExpenseAction: async (expenseId: string) => {
    const userId = get().userId;
    if (!userId) return;
    const expense = get().expenses.find((e) => e.id === expenseId);
    if (!expense) return;
    await repo.deleteExpense(expenseId);
    await get().loadAll(userId);
    set({ lastAction: { type: "delete_expense", expense } });
  },

  undoLastAction: async () => {
    const { lastAction, userId } = get();
    if (!lastAction || !userId) return;
    switch (lastAction.type) {
      case "expense":
        await repo.deleteExpense(lastAction.expense.id);
        break;
      case "income":
        await repo.deleteIncome(lastAction.income.id);
        break;
      case "goal":
        await repo.deleteGoal(lastAction.goal.id);
        break;
      case "add_to_goal":
        await repo.addMoneyToGoal(lastAction.goalId, -lastAction.amount);
        break;
      case "delete_expense":
        await repo.restoreExpense(lastAction.expense);
        break;
    }
    set({ lastAction: null });
    await get().loadAll(userId);
  },

  setQuickAddOpen: (open) => set({ quickAddOpen: open }),

  markAllNotificationsRead: async () => {
    const { notifications, userId } = get();
    if (!userId) return;
    await Promise.all(notifications.filter((n) => !n.read).map((n) => repo.markNotificationRead(n.id)));
    await get().loadAll(userId);
  },

  sendAIMessage: async (message: string) => {
    const { userId, profile, goals, expenses } = get();
    if (!userId) return;
    const response = askLifeUp(message, { profile: profile ?? undefined, goals, expenses });
    await repo.addAIConversation(userId, message, response);
    await get().loadAll(userId);
  },

  logAIConversation: async (message: string, response: string) => {
    const userId = get().userId;
    if (!userId) return;
    await repo.addAIConversation(userId, message, response);
    await get().loadAll(userId);
  },

  addBalanceCheckin: async (balance: number, date?: string) => {
    const userId = get().userId;
    if (!userId) return;
    await repo.addBalanceCheckin(userId, balance, date ?? new Date().toISOString().slice(0, 10));
    await get().loadAll(userId);
  },

  exportBackup: async () => {
    const userId = get().userId;
    if (!userId) return;
    const backup = await buildBackup(userId);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadJSON(backup, `LifeUp-backup-${dateStr}.json`);
  },

  restoreFromBackupFile: async (file: File) => {
    const userId = get().userId;
    if (!userId) return;
    const backup = await parseBackupFile(file);
    await restoreBackupData(userId, backup);
    await get().loadAll(userId);
  },

  exportExcel: async () => {
    const { expenses, income, goals } = get();
    const dateStr = new Date().toISOString().slice(0, 10);
    await exportToExcel({ expenses, income, goals }, `LifeUp-export-${dateStr}.xlsx`);
  },

  importExcelFile: async (file: File) => {
    const userId = get().userId;
    if (!userId) return { expensesAdded: 0, incomeAdded: 0 };
    const { expenses, income } = await importFromExcel(file);
    for (const e of expenses) await repo.addExpense({ userId, ...e });
    for (const i of income) await repo.addIncome({ userId, ...i });
    await get().loadAll(userId);
    return { expensesAdded: expenses.length, incomeAdded: income.length };
  },

  deleteAllData: async () => {
    const userId = get().userId;
    if (!userId) return;
    await deleteAllUserData(userId);
    set({
      userId: null,
      user: null,
      profile: null,
      goals: [],
      expenses: [],
      income: [],
      notifications: [],
      achievements: [],
      aiConversations: [],
      balanceCheckins: [],
      budget: null,
    });
  },
}));
