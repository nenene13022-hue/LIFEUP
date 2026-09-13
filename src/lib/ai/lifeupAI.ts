import type { Expense, FinancialProfile, Goal } from "../types/models";
import {
  calcBudgetSummary,
  calcGoalMath,
  calcSpendingTrends,
  spendingByCategory,
  expensesInMonth,
  sumExpenses,
} from "../calc/financialEngine";

export interface AIContext {
  profile: FinancialProfile | undefined;
  goals: Goal[];
  expenses: Expense[];
}

const CATEGORY_LABELS: Record<string, string> = {
  food: "אוכל",
  transport: "תחבורה",
  shopping: "קניות",
  fun: "בילויים",
  home: "בית",
  bills: "חשבונות",
  travel: "נסיעות",
  other: "אחר",
};

function nearestGoal(goals: Goal[]): Goal | null {
  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) return null;
  return [...active].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  )[0];
}

function hasProfile(profile?: FinancialProfile) {
  return !!profile && (profile.monthlyIncome > 0 || profile.fixedExpenses > 0);
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("he-IL");
}

type Intent =
  | "status"
  | "how_much_today"
  | "reach_amount"
  | "got_money"
  | "spent_amount"
  | "no_money_end_month"
  | "goal_progress"
  | "greeting"
  | "unknown";

function detectIntent(msg: string): Intent {
  const m = msg.trim();
  const has = (...words: string[]) => words.some((w) => m.includes(w));

  if (has("שלום", "היי", "הי ")) return "greeting";
  if (has("מה המצב", "איך אני עומד", "סטטוס")) return "status";
  if (has("כמה אני יכול להוציא", "כמה מותר לי", "כמה נשאר לי היום")) return "how_much_today";
  if (has("איך אני מגיע ל", "איך להגיע ל", "איך אחסוך")) return "reach_amount";
  if (has("קיבלתי", "משכורת", "העברה", "בונוס")) return "got_money";
  if (has("הוצאתי", "בזבזתי")) return "spent_amount";
  if (has("בלי כסף", "נגמר לי הכסף", "תמיד מסיים את החודש")) return "no_money_end_month";
  if (has("יעד", "חופשה", "לחסוך ל")) return "goal_progress";
  return "unknown";
}

function extractNumber(msg: string): number | null {
  const match = msg.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function getHomeInsight(ctx: AIContext): string {
  const { profile, goals, expenses } = ctx;
  if (!hasProfile(profile)) {
    return "השלם את הפרופיל הפיננסי שלך כדי לקבל תובנות מותאמות אישית.";
  }

  const budget = calcBudgetSummary(profile!, goals, expenses);
  const goal = nearestGoal(goals);
  const goalMath = goal ? calcGoalMath(goal, budget.monthlyDiscretionary) : null;
  const trends = calcSpendingTrends(expenses);

  if (trends[0] && goalMath && goalMath.requiredDailySaving > 0) {
    const daysEarlier = Math.max(Math.round(100 / goalMath.requiredDailySaving), 1);
    return `${trends[0].text} אם תוריד את ההוצאה הזו ב-100 ₪, תוכל להגיע ליעד שלך כ-${daysEarlier} ימים מוקדם יותר.`;
  }

  if (trends[0]) return trends[0].text;

  if (goalMath) {
    return goalMath.isRealistic
      ? "אם תשמור על הקצב הנוכחי, תגיע ליעד שלך בזמן."
      : `כדי לעמוד ביעד "${goal?.name}" בזמן, כדאי להגביר מעט את קצב החיסכון.`;
  }

  return budget.status === "on_track"
    ? "אתה שומר על תקציב מאוזן החודש. המשך כך."
    : "כדאי לשים לב לקצב ההוצאות בימים הקרובים כדי לחזור למסלול.";
}

export function askLifeUp(message: string, ctx: AIContext): string {
  const { profile, goals, expenses } = ctx;

  if (!hasProfile(profile)) {
    return "עדיין אין לי מספיק נתונים עליך כדי לענות בדיוק. בוא נשלים קודם את הפרופיל הפיננסי שלך במסך ההגדרות, ואז אוכל לתת לך תשובות מדויקות במקום ניחושים.";
  }

  const budget = calcBudgetSummary(profile!, goals, expenses);
  const goal = nearestGoal(goals);
  const goalMath = goal ? calcGoalMath(goal, budget.monthlyDiscretionary) : null;
  const intent = detectIntent(message);
  const number = extractNumber(message);

  switch (intent) {
    case "greeting":
      return "היי! אני כאן כדי לעזור לך לקבל החלטות טובות יותר עם הכסף שלך. תשאל אותי כל דבר — על התקציב, ההוצאות או היעדים שלך.";

    case "status": {
      const trends = calcSpendingTrends(expenses);
      const statusText =
        budget.status === "on_track"
          ? "אתה במסלול טוב 👍"
          : budget.status === "caution"
          ? "אתה קרוב לתקרת התקציב החודשי — כדאי לשים לב."
          : "חרגת מהתקציב המתוכנן החודש.";
      let out = `${statusText}\nהוצאת עד עכשיו ${fmt(budget.spentThisMonth)} ₪ מתוך ${fmt(
        budget.monthlyDiscretionary
      )} ₪ שמתוכננים החודש לאחר חובות וחיסכון ליעדים.`;
      if (goal && goalMath) {
        out += `\nהיעד הקרוב שלך — "${goal.name}" — נמצא ב-${goalMath.progressPct}%.`;
      }
      if (trends[0]) out += `\n${trends[0].text}`;
      return out;
    }

    case "how_much_today":
      return `היום אתה יכול להרשות לעצמך עד ${fmt(budget.dailyLimit)} ₪, בהתבסס על התקציב הפנוי שנשאר לך החודש (${fmt(
        budget.remainingThisMonth
      )} ₪) חלקי ${budget.daysRemainingInMonth} הימים שנותרו.`;

    case "got_money": {
      const amount = number ?? 0;
      if (!amount) {
        return "כמה קיבלת בדיוק? תכתוב לי סכום ואני אציע לך חלוקה חכמה.";
      }
      if (!goal || !goalMath) {
        return `קיבלת ${fmt(
          amount
        )} ₪ — כל הכבוד. עדיין אין לך יעד פעיל, אז הייתי ממליץ לשריין חלק לחיסכון ולהשאיר את השאר להוצאות שוטפות. רוצה ליצור יעד עכשיו?`;
      }
      const toGoal = Math.min(Math.round(amount * 0.5), goalMath.amountRemaining);
      const free = Math.round(amount * 0.2);
      const rest = amount - toGoal - free;
      return `לפי המצב שלך כרגע, יש לך יעד "${goal.name}" של ${fmt(
        goal.targetAmount
      )} ₪ ואתה ב-${goalMath.progressPct}% ממנו.\n\nהייתי מציע:\n${fmt(
        toGoal
      )} ₪ → לחיסכון ליעד\n${fmt(rest)} ₪ → הוצאות קרובות\n${fmt(
        free
      )} ₪ → כסף חופשי\n\nאם תרצה, אני יכול לבנות לך חלוקה אחרת.`;
    }

    case "spent_amount": {
      const amount = number ?? 0;
      const dailyLimit = budget.dailyLimit;
      if (!amount) return "כמה הוצאת? תכתוב לי סכום ואני אגיד לך אם זה בסדר ביחס לתקציב היומי שלך.";
      if (amount > dailyLimit * 1.3) {
        return `זה קצת מעל התקציב היומי המומלץ שלך (${fmt(
          dailyLimit
        )} ₪). זה לא סוף העולם — פשוט כדאי לצמצם קצת בימים הקרובים כדי לחזור למסלול.`;
      }
      return `זה בגבולות הסביר ביחס לתקציב היומי שלך (${fmt(dailyLimit)} ₪). אתה בסדר.`;
    }

    case "no_money_end_month": {
      const byCat = spendingByCategory(expensesInMonth(expenses));
      const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];
      let out = "בואי נבין את זה יחד, בלי שיפוטיות. ";
      if (top) {
        out += `הקטגוריה שהכי מכבידה על התקציב שלך החודש היא "${
          CATEGORY_LABELS[top[0]] ?? top[0]
        }" עם ${fmt(top[1])} ₪.`;
      }
      out += `\nהתקציב הפנוי שהוגדר לחודש הוא ${fmt(
        budget.monthlyDiscretionary
      )} ₪ אחרי הוצאות קבועות וחיסכון ליעדים. אם ננסה לצמצם מעט באותה קטגוריה, זה כבר ישפיע.`;
      return out;
    }

    case "reach_amount": {
      const amount = number;
      if (amount) {
        return `כדי להגיע ל-${fmt(
          amount
        )} ₪, הכי פשוט להגדיר את זה כיעד חדש עם תאריך — כך אוכל לחשב לך בדיוק כמה לחסוך ביום, בשבוע ובחודש.`;
      }
      if (goal && goalMath) {
        return `כדי להגיע ל"${goal.name}" (${fmt(goal.targetAmount)} ₪) עד ${new Date(
          goal.targetDate
        ).toLocaleDateString("he-IL")}, צריך לחסוך כ-${fmt(
          goalMath.requiredWeeklySaving
        )} ₪ בשבוע. ${
          goalMath.isRealistic ? "זה נראה ריאלי לפי הקצב הנוכחי שלך." : "כרגע היעד מעט אגרסיבי ביחס להכנסה הפנויה שלך."
        }`;
      }
      return "עדיין אין לך יעד מוגדר. תרצה שניצור אחד יחד?";
    }

    case "goal_progress": {
      if (!goal || !goalMath) return "אין לך כרגע יעד פעיל. בוא ניצור אחד — זה לוקח פחות מדקה.";
      return `"${goal.name}": ${fmt(goal.currentAmount)} מתוך ${fmt(goal.targetAmount)} ₪ (${
        goalMath.progressPct
      }%).\nנשארו ${fmt(goalMath.amountRemaining)} ₪ ו-${goalMath.daysRemaining} ימים עד התאריך היעד.\nכדי לעמוד בזה, כדאי לחסוך כ-${fmt(
        goalMath.requiredWeeklySaving
      )} ₪ בשבוע.`;
    }

    default: {
      const totalSpentMonth = sumExpenses(expensesInMonth(expenses));
      return `החודש הוצאת עד עכשיו ${fmt(totalSpentMonth)} ₪ ונשארו לך ${fmt(
        budget.remainingThisMonth
      )} ₪ פנויים. תשאל אותי משהו יותר ספציפי — למשל "כמה אני יכול להוציא היום?" או "איך אני מגיע ליעד שלי?" ואני אתן לך תשובה מבוססת על הנתונים שלך.`;
    }
  }
}
