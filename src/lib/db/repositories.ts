import { getDB, uid } from "./db";
import type {
  User,
  FinancialProfile,
  Goal,
  Expense,
  Income,
  AIConversation,
  AppNotification,
  Achievement,
  BalanceCheckin,
} from "../types/models";

// ---------- Session ----------
export async function setSession(userId: string) {
  const db = await getDB();
  await db.put("session", { key: "current", userId });
}

export async function getSessionUserId(): Promise<string | null> {
  const db = await getDB();
  const row = await db.get("session", "current");
  return row?.userId ?? null;
}

export async function clearSession() {
  const db = await getDB();
  await db.delete("session", "current");
}

// ---------- Users ----------
export async function createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
  const db = await getDB();
  const user: User = { ...data, id: uid("user"), createdAt: new Date().toISOString() };
  await db.put("users", user);
  return user;
}

export async function getUser(userId: string): Promise<User | undefined> {
  const db = await getDB();
  return db.get("users", userId);
}

export async function updateUser(userId: string, patch: Partial<User>) {
  const db = await getDB();
  const existing = await db.get("users", userId);
  if (!existing) return;
  await db.put("users", { ...existing, ...patch });
}

// ---------- Financial profile ----------
export async function upsertFinancialProfile(
  userId: string,
  patch: Partial<Omit<FinancialProfile, "userId" | "updatedAt">>
): Promise<FinancialProfile> {
  const db = await getDB();
  const existing = await db.get("financialProfiles", userId);
  const merged: FinancialProfile = {
    userId,
    monthlyIncome: existing?.monthlyIncome ?? 0,
    fixedExpenses: existing?.fixedExpenses ?? 0,
    currentSavings: existing?.currentSavings ?? 0,
    currentDebt: existing?.currentDebt ?? 0,
    debtMonthlyPayment: existing?.debtMonthlyPayment ?? 0,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.put("financialProfiles", merged);
  return merged;
}

export async function getFinancialProfile(userId: string): Promise<FinancialProfile | undefined> {
  const db = await getDB();
  return db.get("financialProfiles", userId);
}

// ---------- Goals ----------
export async function createGoal(data: Omit<Goal, "id" | "createdAt" | "status">): Promise<Goal> {
  const db = await getDB();
  const goal: Goal = {
    ...data,
    id: uid("goal"),
    createdAt: new Date().toISOString(),
    status: "active",
  };
  await db.put("goals", goal);
  return goal;
}

export async function updateGoal(goalId: string, patch: Partial<Goal>) {
  const db = await getDB();
  const existing = await db.get("goals", goalId);
  if (!existing) return;
  const updated = { ...existing, ...patch };
  await db.put("goals", updated);
  return updated;
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("goals", "userId", userId);
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getGoal(goalId: string): Promise<Goal | undefined> {
  const db = await getDB();
  return db.get("goals", goalId);
}

export async function deleteGoal(goalId: string) {
  const db = await getDB();
  await db.delete("goals", goalId);
}

export async function addMoneyToGoal(goalId: string, amount: number) {
  const db = await getDB();
  const goal = await db.get("goals", goalId);
  if (!goal) return;
  const currentAmount = goal.currentAmount + amount;
  const status = currentAmount >= goal.targetAmount ? "completed" : goal.status;
  const updated = { ...goal, currentAmount, status };
  await db.put("goals", updated);
  return updated;
}

// ---------- Expenses ----------
export async function addExpense(data: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
  const db = await getDB();
  const expense: Expense = { ...data, id: uid("exp"), createdAt: new Date().toISOString() };
  await db.put("expenses", expense);
  return expense;
}

export async function getExpenses(userId: string): Promise<Expense[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("expenses", "userId", userId);
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function deleteExpense(id: string) {
  const db = await getDB();
  await db.delete("expenses", id);
}

export async function restoreExpense(expense: Expense) {
  const db = await getDB();
  await db.put("expenses", expense);
}

// ---------- Income ----------
export async function addIncome(data: Omit<Income, "id">): Promise<Income> {
  const db = await getDB();
  const income: Income = { ...data, id: uid("inc") };
  await db.put("income", income);
  return income;
}

export async function getIncomeList(userId: string): Promise<Income[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("income", "userId", userId);
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function deleteIncome(id: string) {
  const db = await getDB();
  await db.delete("income", id);
}

// ---------- AI conversations ----------
export async function addAIConversation(
  userId: string,
  message: string,
  response: string
): Promise<AIConversation> {
  const db = await getDB();
  const row: AIConversation = {
    id: uid("ai"),
    userId,
    message,
    response,
    createdAt: new Date().toISOString(),
  };
  await db.put("aiConversations", row);
  return row;
}

export async function getAIConversations(userId: string): Promise<AIConversation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("aiConversations", "userId", userId);
  return all.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
}

// ---------- Balance check-ins ----------
export async function addBalanceCheckin(userId: string, balance: number, date: string): Promise<BalanceCheckin> {
  const db = await getDB();
  const row: BalanceCheckin = {
    id: uid("checkin"),
    userId,
    balance,
    date,
    createdAt: new Date().toISOString(),
  };
  await db.put("balanceCheckins", row);
  return row;
}

export async function getBalanceCheckins(userId: string): Promise<BalanceCheckin[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("balanceCheckins", "userId", userId);
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function deleteBalanceCheckin(id: string) {
  const db = await getDB();
  await db.delete("balanceCheckins", id);
}

// ---------- Notifications ----------
export async function addNotification(
  data: Omit<AppNotification, "id" | "read" | "createdAt">
): Promise<AppNotification> {
  const db = await getDB();
  const row: AppNotification = {
    ...data,
    id: uid("notif"),
    read: false,
    createdAt: new Date().toISOString(),
  };
  await db.put("notifications", row);
  return row;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("notifications", "userId", userId);
  return all.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
}

export async function markNotificationRead(id: string) {
  const db = await getDB();
  const row = await db.get("notifications", id);
  if (!row) return;
  await db.put("notifications", { ...row, read: true });
}

// ---------- Achievements ----------
export async function unlockAchievement(
  userId: string,
  key: string,
  title: string,
  emoji: string
): Promise<Achievement | null> {
  const db = await getDB();
  const existing = await db.getAllFromIndex("achievements", "userId", userId);
  if (existing.some((a) => a.key === key)) return null;
  const row: Achievement = {
    id: uid("ach"),
    userId,
    key,
    title,
    emoji,
    unlockedAt: new Date().toISOString(),
  };
  await db.put("achievements", row);
  return row;
}

export async function getAchievements(userId: string): Promise<Achievement[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("achievements", "userId", userId);
  return all.sort((a, b) => (a.unlockedAt > b.unlockedAt ? 1 : -1));
}
