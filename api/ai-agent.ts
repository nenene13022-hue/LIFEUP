import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { TOOL_DECLARATIONS, type ToolCall } from "../src/lib/ai/agentTools";

export const config = { runtime: "nodejs" };

// Best-effort per-instance rate limit. Serverless instances are ephemeral and this
// resets on cold start, so it is a speed bump against casual abuse, not a real
// security boundary. For production-grade limiting, move this to Upstash/Vercel KV.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT;
}

const SYSTEM_INSTRUCTION = `אתה LIFEUP — עוזר פיננסי אישי חכם, רגוע, ישיר ולא שיפוטי, בתוך אפליקציית ניהול כסף.

חוקים קשיחים:
1. אתה לא רואה ולא נוגע במסד הנתונים בעצמך. כדי לבצע פעולה (הוספת הוצאה/הכנסה/יעד/חיסכון ליעד/מחיקת הוצאה) אתה חייב לקרוא לכלי (function call) המתאים. אסור לך לכתוב בטקסט "הוספתי" או "בוצע" — רק הקריאה לכלי מבצעת את הפעולה בפועל, והלקוח הוא זה שיאשר בסופו של דבר שהיא הצליחה.
2. לעולם אל תמציא נתונים (יתרות, סכומים, תאריכים) שלא קיבלת בהקשר שסופק לך. אם משהו חסר כדי לענות, תגיד בבירור שאין לך את הנתון, או שאל שאלה קצרה וממוקדת כדי להשלים רק את מה שחסר.
3. הבחן בין עובדה (נתון שהוזן בפועל), חישוב (נגזר ממספרים קיימים), הערכה/תחזית (משוער), והמלצה (דעה) — ואל תציג הערכה כעובדה.
4. אל תיתן ייעוץ השקעות מקצועי.
5. תשובות קצרות, ברורות, בעברית טבעית וחברית. בלי פסקאות ארוכות.
6. אם המשתמש מבקש פעולה הרסנית (מחיקה) — קרא לכלי delete_expense בכל זאת (הלקוח יציג אישור למשתמש לפני שהיא תבוצע בפועל; אתה לא צריך לשאול "האם אתה בטוח" בעצמך).
7. אם המשתמש מבקש להוסיף כסף ליעד ולא ברור לאיזה יעד מתוך היעדים הקיימים שסופקו לך בהקשר, בחר את ההתאמה הכי סבירה לפי השם ואל תמציא שם יעד חדש.
8. תאריך של "היום" יסופק לך בהקשר — תמיד תשתמש בו לחישוב "היום"/"אתמול"/"מחר" ביחס אליו, ולא בתאריך אחר.`;

interface RequestBody {
  message: string;
  today: string;
  context: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
  apiKey?: string;
}

function toGeminiDeclarations(): FunctionDeclaration[] {
  return TOOL_DECLARATIONS.map((t) => ({
    // The exact per-property schema shape (string vs enum-string vs number) is a
    // discriminated union in the SDK's types that doesn't infer well through this
    // generic mapping; the shape built below is valid at runtime.

    name: t.name,
    description: t.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(t.parameters.properties).map(([key, val]) => [
          key,
          {
            type: val.type === "number" ? SchemaType.NUMBER : SchemaType.STRING,
            description: val.description,
            ...("enum" in val && val.enum ? { enum: val.enum, format: "enum" as const } : {}),
          },
        ])
      ),
      required: t.parameters.required,
    },
  })) as unknown as FunctionDeclaration[];
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "בקשה לא תקינה." }), { status: 400 });
  }

  const { message, today, context, history = [], apiKey: clientApiKey } = body;
  if (!message || typeof message !== "string" || message.length > 2000) {
    return new Response(JSON.stringify({ error: "הודעה לא תקינה." }), { status: 400 });
  }
  if (clientApiKey && (typeof clientApiKey !== "string" || clientApiKey.length > 200)) {
    return new Response(JSON.stringify({ error: "מפתח API לא תקין." }), { status: 400 });
  }

  // A key pasted by the user in Settings always wins — that's what lets each user
  // bring their own key (and their own Gemini quota). process.env.GEMINI_API_KEY is
  // only a deployer-configured fallback for when no personal key has been set, so
  // only THAT shared path is rate-limited — bring-your-own-key traffic is the
  // user's own quota to manage.
  const apiKey = (clientApiKey && clientApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "עדיין אין מפתח Gemini מוגדר. אפשר להוסיף אחד בהגדרות." }),
      { status: 500 }
    );
  }
  if (!clientApiKey) {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "יותר מדי בקשות. נסה שוב בעוד דקה." }), { status: 429 });
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: toGeminiDeclarations() }],
    });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `היום הוא ${today}. הקשר פיננסי נוכחי של המשתמש:\n${context}` }],
        },
        { role: "model", parts: [{ text: "הבנתי, אני מוכן לעזור." }] },
        ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const call = response.functionCalls()?.[0];
    const text = response.text();

    if (call) {
      const action = { tool: call.name, args: call.args } as ToolCall;
      return new Response(JSON.stringify({ reply: text || "", action }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply: text || "לא הצלחתי להבין. תוכל לנסח אחרת?" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("ai-agent error", err);
    return new Response(JSON.stringify({ error: "משהו השתבש. נסה שוב." }), { status: 500 });
  }
}
