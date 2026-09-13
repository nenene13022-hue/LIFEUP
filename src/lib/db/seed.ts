import { createUser, upsertFinancialProfile, createGoal, addExpense, setSession } from "./repositories";
import type { ExpenseCategory } from "../types/models";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function seedDemoUser(): Promise<string> {
  const user = await createUser({
    name: "דמו",
    email: "demo@lifeup.app",
    currency: "ILS",
    language: "he",
    authProvider: "demo",
    isPremium: false,
  });

  await upsertFinancialProfile(user.id, {
    monthlyIncome: 8000,
    fixedExpenses: 3500,
    currentSavings: 1000,
    currentDebt: 0,
    debtMonthlyPayment: 0,
  });

  await createGoal({
    userId: user.id,
    name: "חופשה ביוון",
    targetAmount: 5000,
    currentAmount: 3200,
    targetDate: inDays(63),
    category: "vacation",
    emoji: "🇬🇷",
  });

  await createGoal({
    userId: user.id,
    name: "טלפון חדש",
    targetAmount: 5000,
    currentAmount: 1200,
    targetDate: inDays(290),
    category: "big_purchase",
    emoji: "📱",
  });

  await createGoal({
    userId: user.id,
    name: "קרן חירום",
    targetAmount: 10000,
    currentAmount: 2000,
    targetDate: inDays(620),
    category: "save",
    emoji: "💰",
  });

  const demoExpenses: Array<{ amount: number; category: ExpenseCategory; day: number; description: string }> = [
    { amount: 42, category: "food", day: 0, description: "ארוחת צהריים" },
    { amount: 120, category: "fun", day: 0, description: "בילוי בערב" },
    { amount: 65, category: "transport", day: 1, description: "דלק" },
    { amount: 89, category: "bills", day: 1, description: "חשבון חשמל" },
    { amount: 210, category: "shopping", day: 2, description: "בגדים" },
    { amount: 55, category: "food", day: 2, description: "סופר" },
    { amount: 150, category: "fun", day: 3, description: "מסעדה" },
    { amount: 38, category: "food", day: 4, description: "קפה ומאפה" },
    { amount: 300, category: "shopping", day: 5, description: "נעליים" },
    { amount: 95, category: "transport", day: 6, description: "מונית" },
    { amount: 180, category: "fun", day: 6, description: "קולנוע וארוחה" },
    { amount: 220, category: "food", day: 7, description: "סופר שבועי" },
    { amount: 160, category: "other", day: 8, description: "שונות" },
    { amount: 240, category: "fun", day: 9, description: "בילוי סופ״ש" },
    { amount: 88, category: "bills", day: 10, description: "חשבון סלולר" },
    { amount: 175, category: "shopping", day: 11, description: "מוצרי בית" },
    { amount: 60, category: "transport", day: 12, description: "דלק" },
    { amount: 52, category: "food", day: 13, description: "ארוחה בחוץ" },
  ];

  for (const e of demoExpenses) {
    await addExpense({
      userId: user.id,
      amount: e.amount,
      category: e.category,
      date: daysAgo(e.day),
      description: e.description,
    });
  }

  await setSession(user.id);
  return user.id;
}
