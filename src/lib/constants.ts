import type { ExpenseCategory, GoalCategory } from "./types/models";

export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; emoji: string }[] = [
  { key: "food", label: "אוכל", emoji: "🍔" },
  { key: "transport", label: "תחבורה", emoji: "🚗" },
  { key: "shopping", label: "קניות", emoji: "🛍️" },
  { key: "fun", label: "בילויים", emoji: "🎮" },
  { key: "home", label: "בית", emoji: "🏠" },
  { key: "bills", label: "חשבונות", emoji: "💳" },
  { key: "travel", label: "נסיעות", emoji: "✈️" },
  { key: "other", label: "אחר", emoji: "📦" },
];

export const GOAL_CATEGORIES: { key: GoalCategory; label: string; emoji: string }[] = [
  { key: "save", label: "לחסוך כסף", emoji: "💰" },
  { key: "debt", label: "לסגור חובות", emoji: "💳" },
  { key: "vacation", label: "לממן חופשה", emoji: "✈️" },
  { key: "car", label: "לקנות רכב", emoji: "🚗" },
  { key: "big_purchase", label: "לקנות משהו גדול", emoji: "📱" },
  { key: "apartment", label: "לחסוך לדירה", emoji: "🏠" },
  { key: "other", label: "מטרה אחרת", emoji: "🎯" },
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: "#34D399",
  transport: "#60A5FA",
  shopping: "#F472B6",
  fun: "#7C5CFF",
  home: "#FBBF24",
  bills: "#F87171",
  travel: "#22D3AE",
  other: "#9CA3AF",
};

export function expenseCategoryMeta(key: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((c) => c.key === key) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function goalCategoryMeta(key: GoalCategory) {
  return GOAL_CATEGORIES.find((c) => c.key === key) ?? GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1];
}
