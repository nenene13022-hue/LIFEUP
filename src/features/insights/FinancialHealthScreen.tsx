import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wallet, PiggyBank, Scale, ShieldCheck, PieChart } from "lucide-react";
import { ScreenHeader, Card, Badge } from "../../components/ui/primitives";
import { useApp } from "../../state/store";
import { calcFinancialHealth, type HealthStatus } from "../../lib/calc/financialHealth";
import { formatCurrency } from "../../lib/utils/format";

const STATUS_TONE: Record<HealthStatus, "positive" | "warning" | "negative"> = {
  good: "positive",
  caution: "warning",
  bad: "negative",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  good: "תקין",
  caution: "שים לב",
  bad: "דורש טיפול",
};

function MetricCard({
  icon,
  title,
  value,
  status,
  explanation,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  status: HealthStatus;
  explanation: string;
}) {
  return (
    <Card className="mb-3 animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-text-secondary shrink-0">
            {icon}
          </div>
          <p className="font-semibold text-sm">{title}</p>
        </div>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>
      <p className="text-2xl font-extrabold mb-1">{value}</p>
      <p className="text-xs text-text-secondary leading-relaxed">{explanation}</p>
    </Card>
  );
}

export function FinancialHealthScreen() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const goals = useApp((s) => s.goals);
  const expenses = useApp((s) => s.expenses);
  const income = useApp((s) => s.income);
  const balanceCheckins = useApp((s) => s.balanceCheckins);

  const report = useMemo(() => {
    if (!profile) return null;
    return calcFinancialHealth(profile, goals, expenses, income, balanceCheckins);
  }, [profile, goals, expenses, income, balanceCheckins]);

  if (!profile || !report) {
    return (
      <div className="pb-4">
        <ScreenHeader title="מצב פיננסי" />
        <p className="text-text-secondary text-sm">צריך קודם להשלים פרופיל פיננסי בהגדרות.</p>
      </div>
    );
  }

  const { breakdown } = report;

  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="tap-scale w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0"
          aria-label="חזרה"
        >
          <ArrowRight size={18} />
        </button>
        <ScreenHeader title="מצב פיננסי" subtitle="ככה רואה חשבון היה מסתכל על התמונה שלך." />
      </div>

      <Card className="mb-4 relative overflow-hidden animate-fade-in">
        <div className="absolute inset-0 opacity-10 bg-gradient-brand" />
        <p className="text-text-secondary text-sm mb-1 flex items-center gap-1.5">
          <Wallet size={15} />
          שווי נקי משוער
        </p>
        <p className={`text-4xl font-extrabold tracking-tight ${report.netWorth < 0 ? "text-negative" : ""}`}>
          {formatCurrency(report.netWorth)}
        </p>
        <p className="text-xs text-text-muted mt-2">יתרה משוערת + חיסכון ביעדים − חובות</p>
      </Card>

      <MetricCard
        icon={<PiggyBank size={17} />}
        title="שיעור חיסכון"
        value={`${Math.round(report.savingsRate)}%`}
        status={report.savingsRateStatus}
        explanation="מומחים ממליצים על 10%–20% ומעלה מההכנסה החודשית. זה מחושב מהכנסה פחות כל ההוצאות (קבועות ומשתנות) החודש."
      />

      <MetricCard
        icon={<Scale size={17} />}
        title="יחס חוב להכנסה"
        value={`${Math.round(report.debtToIncome)}%`}
        status={report.debtToIncomeStatus}
        explanation="תשלומי החוב החודשיים ביחס להכנסה. מתחת ל-36% נחשב בריא; מעל 43% נחשב עומס משמעותי."
      />

      <MetricCard
        icon={<ShieldCheck size={17} />}
        title="כרית ביטחון (קרן חירום)"
        value={report.emergencyFundMonths >= 99 ? "99+ חודשים" : `${report.emergencyFundMonths.toFixed(1)} חודשים`}
        status={report.emergencyFundStatus}
        explanation="כמה חודשים של הוצאות קבועות + חוב היתרה הנוכחית שלך מכסה. המלצה מקובלת: 3–6 חודשים."
      />

      <MetricCard
        icon={<Scale size={17} />}
        title="נטל הוצאות קבועות"
        value={`${Math.round(report.fixedExpenseRatio)}%`}
        status={report.fixedExpenseRatioStatus}
        explanation="איזה חלק מההכנסה הולך על הוצאות קבועות (שכ״ד, חשבונות וכו׳). ככל שנמוך יותר — יש יותר גמישות פיננסית."
      />

      <Card className="mb-4 animate-fade-in">
        <p className="font-semibold text-sm mb-3 flex items-center gap-2">
          <PieChart size={16} />
          חלוקת 50/30/20
        </p>
        <div className="h-3 rounded-full overflow-hidden flex mb-3 bg-surface-3">
          <div className="h-full bg-brand-from" style={{ width: `${Math.min(breakdown.needsPct, 100)}%` }} />
          <div className="h-full bg-brand-to" style={{ width: `${Math.min(breakdown.wantsPct, 100)}%` }} />
          <div className="h-full bg-positive" style={{ width: `${Math.min(breakdown.savingsPct, 100)}%` }} />
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-from" />
              צרכים (יעד 50%)
            </span>
            <span className="text-text-secondary">
              {formatCurrency(breakdown.needs)} · {Math.round(breakdown.needsPct)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-to" />
              רצונות (יעד 30%)
            </span>
            <span className="text-text-secondary">
              {formatCurrency(breakdown.wants)} · {Math.round(breakdown.wantsPct)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-positive" />
              חיסכון (יעד 20%)
            </span>
            <span className="text-text-secondary">
              {formatCurrency(breakdown.savings)} · {Math.round(breakdown.savingsPct)}%
            </span>
          </div>
        </div>
      </Card>

      <p className="text-text-muted text-[11px] leading-relaxed px-1">
        הנתונים כאן הם הערכה בלבד לפי המידע שהזנת, ואינם מהווים ייעוץ פיננסי מקצועי.
      </p>
    </div>
  );
}
