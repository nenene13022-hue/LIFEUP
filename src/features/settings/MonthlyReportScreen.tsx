import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Printer } from "lucide-react";
import { useApp } from "../../state/store";
import { buildMonthlyReport, listAvailableMonths } from "../../lib/reports/monthlyReport";
import { formatCurrency, formatDate } from "../../lib/utils/format";
import { CATEGORY_COLORS, expenseCategoryMeta } from "../../lib/constants";

export function MonthlyReportScreen() {
  const navigate = useNavigate();
  const user = useApp((s) => s.user);
  const expenses = useApp((s) => s.expenses);
  const income = useApp((s) => s.income);
  const goals = useApp((s) => s.goals);

  const availableMonths = useMemo(() => listAvailableMonths(expenses, income), [expenses, income]);
  const [selected, setSelected] = useState(() => availableMonths[0] ?? { year: new Date().getFullYear(), month: new Date().getMonth() });

  const report = useMemo(
    () => buildMonthlyReport(selected.year, selected.month, expenses, income, goals),
    [selected, expenses, income, goals]
  );

  const maxCategoryAmount = Math.max(...report.categoryBreakdown.map((c) => c.amount), 1);

  return (
    <div className="min-h-screen bg-white text-[#0b1020]">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/settings")} className="tap-scale w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowRight size={18} />
        </button>
        <select
          className="flex-1 h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
          value={`${selected.year}-${selected.month}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            setSelected({ year: y, month: m });
          }}
        >
          {availableMonths.map((m) => (
            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
              {new Date(m.year, m.month, 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        <button
          onClick={() => window.print()}
          className="tap-scale h-10 px-4 rounded-xl bg-gradient-to-l from-[#22D3AE] to-[#7C5CFF] text-black text-sm font-semibold flex items-center gap-2"
        >
          <Printer size={16} />
          שמור כ-PDF
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 print:px-0 print:py-0">
        <div className="rounded-2xl overflow-hidden mb-6 print:rounded-none">
          <div className="bg-gradient-to-l from-[#22D3AE] to-[#7C5CFF] px-6 py-6 text-black">
            <p className="text-sm font-medium opacity-80">LifeUp — דוח פיננסי חודשי</p>
            <h1 className="text-2xl font-extrabold mt-1">{report.monthLabel}</h1>
            <p className="text-xs opacity-70 mt-2">
              {user?.name ?? ""} · נוצר ב-{formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">הכנסות</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(report.totalIncome)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">הוצאות</p>
            <p className="text-lg font-bold text-rose-500">{formatCurrency(report.totalExpenses)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">נטו</p>
            <p className={`text-lg font-bold ${report.net >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {formatCurrency(report.net)}
            </p>
          </div>
        </div>

        {report.categoryBreakdown.length > 0 && (
          <div className="mb-6 break-inside-avoid">
            <h2 className="text-sm font-bold text-gray-500 mb-3">הוצאות לפי קטגוריה</h2>
            <div className="flex flex-col gap-2.5">
              {report.categoryBreakdown.map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{c.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-gray-500">
                        {formatCurrency(c.amount)} · {c.pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.amount / maxCategoryAmount) * 100}%`,
                          backgroundColor: CATEGORY_COLORS[c.category],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.goals.length > 0 && (
          <div className="mb-6 break-inside-avoid">
            <h2 className="text-sm font-bold text-gray-500 mb-3">יעדים פעילים</h2>
            <div className="flex flex-col gap-3">
              {report.goals.map((g) => (
                <div key={g.name} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{g.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-gray-500">
                        {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-[#22D3AE] to-[#7C5CFF]"
                        style={{ width: `${g.progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.topExpenses.length > 0 && (
          <div className="mb-6 break-inside-avoid">
            <h2 className="text-sm font-bold text-gray-500 mb-3">ההוצאות הגדולות ביותר החודש</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-200">
                  <th className="text-start font-medium py-1.5">תאריך</th>
                  <th className="text-start font-medium py-1.5">קטגוריה</th>
                  <th className="text-start font-medium py-1.5">תיאור</th>
                  <th className="text-end font-medium py-1.5">סכום</th>
                </tr>
              </thead>
              <tbody>
                {report.topExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-600">{formatDate(e.date)}</td>
                    <td className="py-1.5 text-gray-600">
                      {expenseCategoryMeta(e.category).emoji} {expenseCategoryMeta(e.category).label}
                    </td>
                    <td className="py-1.5">{e.description || "—"}</td>
                    <td className="py-1.5 text-end font-medium">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {report.expenseCount === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">אין נתונים לחודש הזה.</p>
        )}

        <p className="text-center text-gray-300 text-[11px] mt-10">נוצר על ידי LifeUp — {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
