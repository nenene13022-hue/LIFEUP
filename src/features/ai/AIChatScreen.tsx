import { useRef, useState } from "react";
import { Send, Undo2 } from "lucide-react";
import { useApp } from "../../state/store";
import { ScreenHeader, Button } from "../../components/ui/primitives";
import { callAgent, buildAgentContext } from "../../lib/ai/agentClient";
import { planToolCall, type AgentPlan } from "../../lib/ai/agentActions";
import { askLifeUp } from "../../lib/ai/lifeupAI";

const EXAMPLES = [
  "מה המצב שלי החודש?",
  "כמה אני יכול להוציא היום?",
  "תוסיף לי הוצאה של 85 שקל על מסעדה היום",
  "קיבלתי משכורת של 7,000 ₪. איך כדאי לחלק אותה?",
  "שים 300 שקל ביעד שלי",
];

type Pending =
  | { kind: "confirm_delete"; expenseId: string; summary: string }
  | { kind: "pick_goal"; amount: number; options: Array<{ id: string; label: string }> }
  | { kind: "pick_expense"; options: Array<{ id: string; label: string }> }
  | null;

export function AIChatScreen() {
  const conversations = useApp((s) => s.aiConversations);
  const profile = useApp((s) => s.profile);
  const goals = useApp((s) => s.goals);
  const expenses = useApp((s) => s.expenses);
  const lastAction = useApp((s) => s.lastAction);
  const undoLastAction = useApp((s) => s.undoLastAction);
  const logAIConversation = useApp((s) => s.logAIConversation);
  const addNewExpense = useApp((s) => s.addNewExpense);
  const addNewIncome = useApp((s) => s.addNewIncome);
  const addNewGoal = useApp((s) => s.addNewGoal);
  const addMoney = useApp((s) => s.addMoney);
  const deleteExpenseAction = useApp((s) => s.deleteExpenseAction);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [showUndo, setShowUndo] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scrollDown() {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  }

  function flashUndo() {
    setShowUndo(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setShowUndo(false), 8000);
  }

  async function runPlan(userMessage: string, plan: AgentPlan) {
    switch (plan.kind) {
      case "execute_expense": {
        await addNewExpense(plan.args);
        await logAIConversation(userMessage, `✅ ${plan.summary}\nנשמר בהצלחה.`);
        flashUndo();
        return;
      }
      case "execute_income": {
        await addNewIncome(plan.args.amount, plan.args.source, plan.args.date);
        await logAIConversation(userMessage, `✅ ${plan.summary}\nנשמר בהצלחה.`);
        flashUndo();
        return;
      }
      case "execute_goal": {
        await addNewGoal({ ...plan.args, currentAmount: plan.args.currentAmount ?? 0, emoji: "🎯" });
        await logAIConversation(userMessage, `✅ ${plan.summary}\nנוצר בהצלחה.`);
        flashUndo();
        return;
      }
      case "execute_add_to_goal": {
        await addMoney(plan.goalId, plan.amount);
        await logAIConversation(userMessage, `✅ ${plan.summary}\nנשמר בהצלחה.`);
        flashUndo();
        return;
      }
      case "confirm_delete_expense": {
        setPending({ kind: "confirm_delete", expenseId: plan.expenseId, summary: plan.summary });
        await logAIConversation(userMessage, `מצאתי הוצאה: ${plan.summary}\nלמחוק אותה?`);
        return;
      }
      case "pick_goal": {
        setPending({ kind: "pick_goal", amount: plan.amount, options: plan.options });
        await logAIConversation(userMessage, "מצאתי כמה יעדים שמתאימים. לאיזה מהם להוסיף?");
        return;
      }
      case "pick_expense": {
        setPending({ kind: "pick_expense", options: plan.options });
        await logAIConversation(userMessage, "מצאתי כמה הוצאות שמתאימות. לאיזו מהן התכוונת?");
        return;
      }
      case "error": {
        await logAIConversation(userMessage, plan.message);
        return;
      }
    }
  }

  async function submit(text?: string) {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput("");
    setPending(null);
    setSending(true);
    try {
      const context = buildAgentContext(profile, goals, expenses);
      const agentResponse = await callAgent(message, context);
      if (agentResponse.action) {
        const today = new Date().toISOString().slice(0, 10);
        const plan = planToolCall(agentResponse.action, { today, goals, expenses });
        await runPlan(message, plan);
      } else {
        await logAIConversation(message, agentResponse.reply);
      }
    } catch {
      // Gemini unavailable (no key / network / quota) — fall back to the local
      // rule-based assistant so the chat still answers analytical questions.
      const response = askLifeUp(message, { profile: profile ?? undefined, goals, expenses });
      await logAIConversation(message, response);
    } finally {
      setSending(false);
      scrollDown();
    }
  }

  async function confirmDeletion() {
    if (pending?.kind !== "confirm_delete") return;
    const { expenseId, summary } = pending;
    setPending(null);
    await deleteExpenseAction(expenseId);
    await logAIConversation("כן, מחק", `🗑️ נמחקה ההוצאה: ${summary}`);
    flashUndo();
    scrollDown();
  }

  async function pickGoalOption(goalId: string, label: string) {
    if (pending?.kind !== "pick_goal") return;
    const amount = pending.amount;
    setPending(null);
    await addMoney(goalId, amount);
    await logAIConversation(label, `✅ הוספת הכסף ליעד נשמרה בהצלחה.`);
    flashUndo();
    scrollDown();
  }

  async function pickExpenseOption(expenseId: string, label: string) {
    if (pending?.kind !== "pick_expense") return;
    setPending(null);
    setPending({ kind: "confirm_delete", expenseId, summary: label });
    await logAIConversation(label, `למחוק את ההוצאה: ${label}?`);
    scrollDown();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <ScreenHeader title="שאל את LIFEUP 🤖" subtitle="אני כאן כדי לעזור לך לקבל החלטות טובות יותר, ולבצע פעולות בשבילך." />

      <div ref={listRef} className="flex-1 overflow-y-auto -mx-5 px-5 pb-3">
        {conversations.length === 0 ? (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-text-secondary text-sm mb-1">כמה דוגמאות למה שאפשר לומר:</p>
            {EXAMPLES.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                className="tap-scale text-start bg-surface-2 border border-border rounded-2xl px-4 py-3 text-sm"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {conversations.map((c) => (
              <div key={c.id} className="flex flex-col gap-2">
                <div className="self-end max-w-[85%] bg-gradient-brand text-black rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm font-medium">
                  {c.message}
                </div>
                <div className="self-start max-w-[85%] bg-surface-2 border border-border rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-line">
                  {c.response}
                </div>
              </div>
            ))}
            {sending && (
              <div className="self-start max-w-[85%] bg-surface-2 border border-border rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-text-secondary">
                חושב...
              </div>
            )}

            {pending?.kind === "confirm_delete" && (
              <div className="self-start max-w-[90%] bg-surface-2 border border-negative/40 rounded-2xl p-3 flex flex-col gap-2">
                <p className="text-sm">{pending.summary}</p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={confirmDeletion}>
                    כן, מחק
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPending(null)}>
                    ביטול
                  </Button>
                </div>
              </div>
            )}

            {(pending?.kind === "pick_goal" || pending?.kind === "pick_expense") && (
              <div className="self-start max-w-[90%] flex flex-col gap-2">
                {pending.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      pending.kind === "pick_goal" ? pickGoalOption(opt.id, opt.label) : pickExpenseOption(opt.id, opt.label)
                    }
                    className="tap-scale text-start bg-surface-2 border border-border rounded-2xl px-4 py-3 text-sm"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showUndo && lastAction && (
        <button
          onClick={async () => {
            await undoLastAction();
            setShowUndo(false);
          }}
          className="tap-scale mb-2 flex items-center justify-center gap-2 bg-surface-2 border border-border rounded-2xl py-2.5 text-sm text-text-secondary"
        >
          <Undo2 size={15} />
          בטל את הפעולה האחרונה
        </button>
      )}

      <div className="flex items-center gap-2 pt-2 pb-1 sticky bottom-0 bg-bg">
        <input
          className="flex-1 h-12 rounded-2xl bg-surface-2 border border-border px-4 text-sm outline-none focus:border-brand-from"
          placeholder="תגיד לי מה תרצה לעשות..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button
          onClick={() => submit()}
          disabled={!input.trim() || sending}
          className="tap-scale w-12 h-12 rounded-2xl bg-gradient-brand text-black flex items-center justify-center disabled:opacity-40"
          aria-label="שלח"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
