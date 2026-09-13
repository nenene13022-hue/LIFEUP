import { openDB, type DBSchema, type IDBPDatabase } from "idb";
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

interface LifeUpDB extends DBSchema {
  users: { key: string; value: User };
  financialProfiles: { key: string; value: FinancialProfile };
  goals: { key: string; value: Goal; indexes: { userId: string } };
  expenses: { key: string; value: Expense; indexes: { userId: string } };
  income: { key: string; value: Income; indexes: { userId: string } };
  aiConversations: { key: string; value: AIConversation; indexes: { userId: string } };
  notifications: { key: string; value: AppNotification; indexes: { userId: string } };
  achievements: { key: string; value: Achievement; indexes: { userId: string } };
  balanceCheckins: { key: string; value: BalanceCheckin; indexes: { userId: string } };
  session: { key: string; value: { key: string; userId: string } };
}

const DB_NAME = "lifeup-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<LifeUpDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LifeUpDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("users", { keyPath: "id" });
          db.createObjectStore("financialProfiles", { keyPath: "userId" });

          const goals = db.createObjectStore("goals", { keyPath: "id" });
          goals.createIndex("userId", "userId");

          const expenses = db.createObjectStore("expenses", { keyPath: "id" });
          expenses.createIndex("userId", "userId");

          const income = db.createObjectStore("income", { keyPath: "id" });
          income.createIndex("userId", "userId");

          const ai = db.createObjectStore("aiConversations", { keyPath: "id" });
          ai.createIndex("userId", "userId");

          const notifications = db.createObjectStore("notifications", { keyPath: "id" });
          notifications.createIndex("userId", "userId");

          const achievements = db.createObjectStore("achievements", { keyPath: "id" });
          achievements.createIndex("userId", "userId");

          db.createObjectStore("session", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          const checkins = db.createObjectStore("balanceCheckins", { keyPath: "id" });
          checkins.createIndex("userId", "userId");
        }
      },
    });
  }
  return dbPromise;
}

export async function resetDB() {
  const db = await getDB();
  db.close();
  dbPromise = null;
  await indexedDB.deleteDatabase(DB_NAME);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
