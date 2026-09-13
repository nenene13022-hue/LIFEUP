import { useRef, useState } from "react";
import { Send, Undo2, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "../../state/store";
import { ScreenHeader, Button } from "../../components/ui/primitives";
import { callAgent, buildAgentContext, type AgentTurnHistory } from "../../lib/ai/agentClient";
import { planToolCall, type AgentPlan } from "../../lib/ai/agentActions";
import { askLifeUp } from "../../lib/ai/lifeupAI";
import { getQuickReplies } from "../../lib/ai/quickReplies";

const MAX_HISTORY_TURNS = 10;

function AiAvatar({ size = 40 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-brand opacity-40 blur-md"
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="relative rounded-full bg-gradient-brand text-black flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Bot size={size * 0.55} />
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-secondary"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

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
  const [quickReplies] = useState<string[]>(() => getQuickReplies());
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
      const history: AgentTurnHistory[] = conversations.slice(-MAX_HISTORY_TURNS).flatMap((c) => [
        { role: "user" as const, text: c.message },
        { role: "model" as const, text: c.response },
      ]);
      const agentResponse = await callAgent(message, context, history);
      if (agentResponse.action) {
        const today = new Date().toISOString().slice(0, 10);
        const plan = planToolCall(agentResponse.action, { today, goals, expenses });
        await runPlan(message, plan);
      } else {
        await logAIConversation(message, agentResponse.reply);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      if (/מכסה/.test(errMsg)) {
        // Quota exceeded — tell the user plainly instead of silently degrading,
        // since the local fallback below can't perform actions or know today's data as well.
        await logAIConversation(message, errMsg);
      } else {
        // Gemini unavailable (network / no key / unexpected error) — fall back to the
        // local rule-based assistant so the chat still answers analytical questions.
        const response = askLifeUp(message, { profile: profile ?? undefined, goals, expenses });
        await logAIConversation(message, response);
      }
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
    <div className="flex flex-col h-[calc(100dvh_-_max(1.5rem,env(safe-area-inset-top))_-_7rem)]">
      <ScreenHeader
        icon={<AiAvatar />}
        title="שאל את LIFEUP"
        subtitle="אני כאן כדי לעזור לך לקבל החלטות טובות יותר, ולבצע פעולות בשבילך."
      />

      <div ref={listRef} className="flex-1 overflow-y-auto -mx-5 px-5 pb-3">
        {conversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
            <AiAvatar size={56} />
            <p className="text-text-secondary text-sm max-w-[28ch]">
              אפשר לשאול אותי כל דבר, או לבחור אחת מהתשובות המהירות למטה.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {conversations.map((c, i) => (
              <motion.div
                key={c.id}
                className="flex flex-col gap-2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut", delay: Math.min(i, 6) * 0.03 }}
              >
                <div className="self-end max-w-[85%] bg-gradient-brand text-black rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm font-medium">
                  {c.message}
                </div>
                <div className="self-start max-w-[85%] bg-surface-2 border border-border rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-line">
                  {c.response}
                </div>
              </motion.div>
            ))}
            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="self-start bg-surface-2 border border-border rounded-2xl rounded-tr-sm px-3 py-2"
              >
                <TypingDots />
              </motion.div>
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

      {quickReplies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 [&::-webkit-scrollbar]:hidden">
          {quickReplies.map((q, i) => (
            <button
              key={q}
              onClick={() => submit(q)}
              disabled={sending}
              className="tap-scale shrink-0 whitespace-nowrap bg-surface-2 border border-border rounded-full px-3.5 py-2 text-xs disabled:opacity-40 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
            >
              {q}
            </button>
          ))}
        </div>
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
