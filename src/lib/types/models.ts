export type Currency = "ILS";
export type Language = "he";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  currency: Currency;
  language: Language;
  authProvider: "email" | "google" | "apple" | "demo";
  isPremium: boolean;
}

export interface FinancialProfile {
  userId: string;
  monthlyIncome: number;
  fixedExpenses: number;
  currentSavings: number;
  currentDebt: number;
  debtMonthlyPayment: number;
  updatedAt: string;
}

export type GoalCategory =
  | "save"
  | "debt"
  | "vacation"
  | "car"
  | "big_purchase"
  | "apartment"
  | "other";

export type GoalStatus = "active" | "completed" | "archived";

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: GoalCategory;
  emoji: string;
  image?: string;
  createdAt: string;
  status: GoalStatus;
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "fun"
  | "home"
  | "bills"
  | "travel"
  | "other";

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  description?: string;
  createdAt: string;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  date: string;
  description?: string;
}

export interface BalanceCheckin {
  id: string;
  userId: string;
  balance: number;
  date: string;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  message: string;
  response: string;
  createdAt: string;
}

export type NotificationType = "warning" | "success" | "info" | "achievement";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  userId: string;
  key: string;
  title: string;
  emoji: string;
  unlockedAt: string;
}

export interface OnboardingSelections {
  goalTypes: GoalCategory[];
}

export type BudgetStatus = "on_track" | "caution" | "over_budget";
