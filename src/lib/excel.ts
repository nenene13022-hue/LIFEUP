import type { Expense, Income, Goal, ExpenseCategory } from "./types/models";
import { expenseCategoryMeta, goalCategoryMeta, EXPENSE_CATEGORIES } from "./constants";

// xlsx is loaded lazily so it doesn't bloat the initial app bundle for users who never export/import.
async function loadXLSX() {
  return import("xlsx");
}

export async function exportToExcel(
  data: { expenses: Expense[]; income: Income[]; goals: Goal[] },
  filename = "LifeUp-export.xlsx"
) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const expenseRows = data.expenses.map((e) => ({
    "תאריך": e.date,
    "סכום": e.amount,
    "קטגוריה": expenseCategoryMeta(e.category).label,
    "הערה": e.description ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "הוצאות");

  const incomeRows = data.income.map((i) => ({
    "תאריך": i.date,
    "סכום": i.amount,
    "מקור": i.source,
    "הערה": i.description ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), "הכנסות");

  const goalRows = data.goals.map((g) => ({
    "שם": g.name,
    "קטגוריה": goalCategoryMeta(g.category).label,
    "סכום יעד": g.targetAmount,
    "נחסך": g.currentAmount,
    "תאריך יעד": g.targetDate,
    "סטטוס": g.status === "active" ? "פעיל" : g.status === "completed" ? "הושלם" : "בארכיון",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goalRows), "יעדים");

  XLSX.writeFile(wb, filename);
}

export interface ImportedExcelData {
  expenses: Array<{ amount: number; category: ExpenseCategory; date: string; description?: string }>;
  income: Array<{ amount: number; source: string; date: string; description?: string }>;
}

function normalizeDate(value: unknown, XLSX: Awaited<ReturnType<typeof loadXLSX>>): string {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const s = String(value ?? "").trim();
  const parsedDate = new Date(s);
  if (!isNaN(parsedDate.getTime())) return parsedDate.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export async function importFromExcel(file: File): Promise<ImportedExcelData> {
  const XLSX = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const expenses: ImportedExcelData["expenses"] = [];
  const expenseSheet = wb.Sheets["הוצאות"];
  if (expenseSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(expenseSheet);
    for (const row of rows) {
      const amount = Number(row["סכום"]);
      if (!amount || amount <= 0) continue;
      const categoryLabel = String(row["קטגוריה"] ?? "").trim();
      const categoryKey = (EXPENSE_CATEGORIES.find((c) => c.label === categoryLabel)?.key ?? "other") as ExpenseCategory;
      expenses.push({
        amount,
        category: categoryKey,
        date: normalizeDate(row["תאריך"], XLSX),
        description: row["הערה"] ? String(row["הערה"]) : undefined,
      });
    }
  }

  const income: ImportedExcelData["income"] = [];
  const incomeSheet = wb.Sheets["הכנסות"];
  if (incomeSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(incomeSheet);
    for (const row of rows) {
      const amount = Number(row["סכום"]);
      if (!amount || amount <= 0) continue;
      income.push({
        amount,
        source: row["מקור"] ? String(row["מקור"]) : "יבוא מ-Excel",
        date: normalizeDate(row["תאריך"], XLSX),
        description: row["הערה"] ? String(row["הערה"]) : undefined,
      });
    }
  }

  return { expenses, income };
}
