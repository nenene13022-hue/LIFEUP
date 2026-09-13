import { getDB } from "./db";
import type {
  User,
  FinancialProfile,
  Goal,
  Expense,
  Income,
  Achievement,
  AppNotification,
  AIConversation,
  BalanceCheckin,
} from "../types/models";

export interface BackupData {
  version: number;
  exportedAt: string;
  user: User;
  profile: FinancialProfile | null;
  goals: Goal[];
  expenses: Expense[];
  income: Income[];
  achievements: Achievement[];
  notifications: AppNotification[];
  aiConversations: AIConversation[];
  balanceCheckins: BalanceCheckin[];
}

const USER_STORES = [
  "goals",
  "expenses",
  "income",
  "achievements",
  "notifications",
  "aiConversations",
  "balanceCheckins",
] as const;

export async function buildBackup(userId: string): Promise<BackupData> {
  const db = await getDB();
  const [user, profile, goals, expenses, income, achievements, notifications, aiConversations, balanceCheckins] =
    await Promise.all([
      db.get("users", userId),
      db.get("financialProfiles", userId),
      db.getAllFromIndex("goals", "userId", userId),
      db.getAllFromIndex("expenses", "userId", userId),
      db.getAllFromIndex("income", "userId", userId),
      db.getAllFromIndex("achievements", "userId", userId),
      db.getAllFromIndex("notifications", "userId", userId),
      db.getAllFromIndex("aiConversations", "userId", userId),
      db.getAllFromIndex("balanceCheckins", "userId", userId),
    ]);
  if (!user) throw new Error("משתמש לא נמצא");
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    user,
    profile: profile ?? null,
    goals,
    expenses,
    income,
    achievements,
    notifications,
    aiConversations,
    balanceCheckins,
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function parseBackupFile(file: File): Promise<BackupData> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("הקובץ אינו קובץ גיבוי תקין (JSON שגוי).");
  }
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as BackupData).goals) ||
    !Array.isArray((data as BackupData).expenses)
  ) {
    throw new Error("הקובץ אינו קובץ גיבוי של LifeUp.");
  }
  return data as BackupData;
}

export async function wipeUserData(userId: string) {
  const db = await getDB();
  for (const store of USER_STORES) {
    const keys = await db.getAllKeysFromIndex(store, "userId", userId);
    const tx = db.transaction(store, "readwrite");
    await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done]);
  }
  await db.delete("financialProfiles", userId);
}

export async function restoreBackup(currentUserId: string, backup: BackupData) {
  const db = await getDB();
  await wipeUserData(currentUserId);

  if (backup.profile) {
    await db.put("financialProfiles", { ...backup.profile, userId: currentUserId });
  }
  for (const g of backup.goals) await db.put("goals", { ...g, userId: currentUserId });
  for (const e of backup.expenses) await db.put("expenses", { ...e, userId: currentUserId });
  for (const i of backup.income) await db.put("income", { ...i, userId: currentUserId });
  for (const a of backup.achievements ?? []) await db.put("achievements", { ...a, userId: currentUserId });
  for (const n of backup.notifications ?? []) await db.put("notifications", { ...n, userId: currentUserId });
  for (const c of backup.aiConversations ?? []) await db.put("aiConversations", { ...c, userId: currentUserId });
  for (const b of backup.balanceCheckins ?? []) await db.put("balanceCheckins", { ...b, userId: currentUserId });
}

export async function deleteAllUserData(userId: string) {
  await wipeUserData(userId);
  const db = await getDB();
  await db.delete("users", userId);
  await db.delete("session", "current");
}
