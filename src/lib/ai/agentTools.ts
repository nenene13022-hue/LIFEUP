// Shared Action Engine schema — the single source of truth for what the AI agent
// is allowed to do. Used both by the serverless function (to tell Gemini what
// tools exist) and by the client (to execute them safely against local data).
// Gemini NEVER touches the database directly — it only returns a tool name + args,
// which the client validates, resolves, and executes.

export type ToolName =
  | "add_expense"
  | "add_income"
  | "create_goal"
  | "add_to_goal"
  | "delete_expense";

export const DESTRUCTIVE_TOOLS: ToolName[] = ["delete_expense"];

export const EXPENSE_CATEGORY_KEYS = [
  "food",
  "transport",
  "shopping",
  "fun",
  "home",
  "bills",
  "travel",
  "other",
] as const;

export const GOAL_CATEGORY_KEYS = [
  "save",
  "debt",
  "vacation",
  "car",
  "big_purchase",
  "apartment",
  "other",
] as const;

// Plain-object schema (JSON-Schema-ish, compatible with Gemini's functionDeclarations
// parameter format) — kept dependency-free so it can be imported from the Vercel
// serverless function without pulling in any Vite/React-only code.
export const TOOL_DECLARATIONS = [
  {
    name: "add_expense" as const,
    description: "מוסיף הוצאה חדשה של המשתמש. השתמש בזה כשהמשתמש מספר שהוא הוציא/קנה/שילם על משהו.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "הסכום ששולם, בשקלים. חייב להיות מספר חיובי." },
        category: {
          type: "string",
          enum: EXPENSE_CATEGORY_KEYS as unknown as string[],
          description: "הקטגוריה המתאימה ביותר להוצאה.",
        },
        date: {
          type: "string",
          description: "תאריך ההוצאה בפורמט YYYY-MM-DD. אם המשתמש לא ציין תאריך, או אמר 'היום', השתמש בתאריך של היום.",
        },
        description: { type: "string", description: "תיאור קצר וחופשי של ההוצאה, אם יש (למשל שם העסק)." },
      },
      required: ["amount", "category", "date"],
    },
  },
  {
    name: "add_income" as const,
    description: "מוסיף הכנסה חדשה של המשתמש. השתמש בזה כשהמשתמש מספר שהוא קיבל כסף/משכורת/תשלום.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "הסכום שהתקבל, בשקלים." },
        source: { type: "string", description: "מקור ההכנסה, למשל 'משכורת', 'פרילנס', 'מתנה'." },
        date: { type: "string", description: "תאריך ההכנסה בפורמט YYYY-MM-DD. ברירת מחדל: היום." },
      },
      required: ["amount", "source", "date"],
    },
  },
  {
    name: "create_goal" as const,
    description: "יוצר יעד חיסכון חדש עבור המשתמש.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "שם היעד." },
        targetAmount: { type: "number", description: "הסכום הכולל שצריך להגיע אליו." },
        currentAmount: { type: "number", description: "כמה כבר נחסך ליעד הזה, אם צוין. אחרת 0." },
        targetDate: { type: "string", description: "תאריך היעד בפורמט YYYY-MM-DD." },
        category: {
          type: "string",
          enum: GOAL_CATEGORY_KEYS as unknown as string[],
          description: "הקטגוריה המתאימה ביותר ליעד.",
        },
      },
      required: ["name", "targetAmount", "targetDate", "category"],
    },
  },
  {
    name: "add_to_goal" as const,
    description: "מוסיף כסף ליעד חיסכון קיים. השתמש בזה כשהמשתמש אומר ששם/הפריש/חסך כסף ליעד מסוים.",
    parameters: {
      type: "object",
      properties: {
        goalName: { type: "string", description: "שם היעד (או חלק ממנו) כפי שהמשתמש כינה אותו." },
        amount: { type: "number", description: "הסכום להוסיף ליעד." },
      },
      required: ["goalName", "amount"],
    },
  },
  {
    name: "delete_expense" as const,
    description:
      "מוחק הוצאה קיימת. פעולה הרסנית שדורשת אישור מהמשתמש — לעולם אל תסמן אותה כמבוצעת בלי אישור מפורש.",
    parameters: {
      type: "object",
      properties: {
        matchDescription: { type: "string", description: "תיאור/שם העסק של ההוצאה שיש למחוק, אם ידוע." },
        matchAmount: { type: "number", description: "הסכום של ההוצאה שיש למחוק, אם ידוע." },
        matchDate: { type: "string", description: "תאריך ההוצאה (YYYY-MM-DD) שיש למחוק, אם ידוע." },
      },
      required: [],
    },
  },
];

export interface AddExpenseArgs {
  amount: number;
  category: (typeof EXPENSE_CATEGORY_KEYS)[number];
  date: string;
  description?: string;
}
export interface AddIncomeArgs {
  amount: number;
  source: string;
  date: string;
}
export interface CreateGoalArgs {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string;
  category: (typeof GOAL_CATEGORY_KEYS)[number];
}
export interface AddToGoalArgs {
  goalName: string;
  amount: number;
}
export interface DeleteExpenseArgs {
  matchDescription?: string;
  matchAmount?: number;
  matchDate?: string;
}

export type ToolCall =
  | { tool: "add_expense"; args: AddExpenseArgs }
  | { tool: "add_income"; args: AddIncomeArgs }
  | { tool: "create_goal"; args: CreateGoalArgs }
  | { tool: "add_to_goal"; args: AddToGoalArgs }
  | { tool: "delete_expense"; args: DeleteExpenseArgs };

export interface AgentResponse {
  reply: string;
  action?: ToolCall;
}
