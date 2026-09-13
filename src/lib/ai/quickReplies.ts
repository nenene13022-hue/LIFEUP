const STORAGE_KEY = "lifeup-quick-replies";

export const DEFAULT_QUICK_REPLIES: string[] = [
  "מה המצב שלי החודש?",
  "כמה אני יכול להוציא היום?",
  "תוסיף לי הוצאה של 85 שקל על מסעדה היום",
  "קיבלתי משכורת של 7,000 ₪. איך כדאי לחלק אותה?",
  "שים 300 שקל ביעד שלי",
];

export function getQuickReplies(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUICK_REPLIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") && parsed.length > 0
      ? parsed
      : DEFAULT_QUICK_REPLIES;
  } catch {
    return DEFAULT_QUICK_REPLIES;
  }
}

export function setQuickReplies(list: string[]) {
  const cleaned = list.map((s) => s.trim()).filter(Boolean);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}

export function resetQuickReplies() {
  localStorage.removeItem(STORAGE_KEY);
}
