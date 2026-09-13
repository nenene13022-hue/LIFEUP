export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("he-IL")} ₪`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
