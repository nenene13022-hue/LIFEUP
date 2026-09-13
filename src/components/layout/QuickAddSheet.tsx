import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Wallet, Target, PiggyBank } from "lucide-react";
import { Sheet } from "../ui/Sheet";
import { Button, Field, inputClass, Chip } from "../ui/primitives";
import { useApp } from "../../state/store";
import { EXPENSE_CATEGORIES } from "../../lib/constants";
import type { ExpenseCategory } from "../../lib/types/models";

type Mode = "menu" | "expense" | "income" | "saving";

export function QuickAddSheet() {
  const open = useApp((s) => s.quickAddOpen);
  const setOpen = useApp((s) => s.setQuickAddOpen);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("menu");

  function close() {
    setOpen(false);
    setTimeout(() => setMode("menu"), 250);
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={
        mode === "menu"
          ? "מה תרצה להוסיף?"
          : mode === "expense"
          ? "מה הוצאת?"
          : mode === "income"
          ? "הוספת הכנסה"
          : "הוספת חיסכון ליעד"
      }
    >
      {mode === "menu" && (
        <div className="grid grid-cols-2 gap-3">
          <QuickTile icon={<CreditCard size={22} />} label="הוצאה" onClick={() => setMode("expense")} />
          <QuickTile icon={<Wallet size={22} />} label="הכנסה" onClick={() => setMode("income")} />
          <QuickTile
            icon={<Target size={22} />}
            label="יעד חדש"
            onClick={() => {
              close();
              navigate("/goals/new");
            }}
          />
          <QuickTile icon={<PiggyBank size={22} />} label="חיסכון ליעד" onClick={() => setMode("saving")} />
        </div>
      )}

      {mode === "expense" && <AddExpenseForm onDone={close} />}
      {mode === "income" && <AddIncomeForm onDone={close} />}
      {mode === "saving" && <AddSavingForm onDone={close} />}
    </Sheet>
  );
}

function QuickTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tap-scale flex flex-col items-center justify-center gap-2 bg-surface-2 border border-border rounded-2xl py-6 text-text-primary"
    >
      <div className="w-11 h-11 rounded-full bg-gradient-brand text-black flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function AddExpenseForm({ onDone }: { onDone: () => void }) {
  const addNewExpense = useApp((s) => s.addNewExpense);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    await addNewExpense({ amount: value, category, date, description: note || undefined });
    setSaving(false);
    onDone();
  }

  return (
    <div>
      <Field label="סכום">
        <input
          className={inputClass}
          inputMode="decimal"
          placeholder="₪ 0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="קטגוריה">
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              selected={category === c.key}
              onClick={() => setCategory(c.key)}
              className="flex flex-col items-center gap-1 py-3 text-center basis-[calc(25%-0.375rem)] grow-0"
            >
              <span className="text-lg">{c.emoji}</span>
              <span className="text-[11px]">{c.label}</span>
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="תאריך">
        <input type="date" className={inputClass} value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="הערה (לא חובה)">
        <input className={inputClass} placeholder="לדוגמה: ארוחת צהריים" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!amount || Number(amount) <= 0 || saving}>
        שמור הוצאה
      </Button>
    </div>
  );
}

function AddIncomeForm({ onDone }: { onDone: () => void }) {
  const addNewIncome = useApp((s) => s.addNewIncome);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    await addNewIncome(value, source || "הכנסה");
    setSaving(false);
    onDone();
  }

  return (
    <div>
      <Field label="סכום">
        <input className={inputClass} inputMode="decimal" placeholder="₪ 0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      <Field label="מקור (לא חובה)">
        <input className={inputClass} placeholder="לדוגמה: משכורת" value={source} onChange={(e) => setSource(e.target.value)} />
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!amount || Number(amount) <= 0 || saving}>
        שמור הכנסה
      </Button>
    </div>
  );
}

function AddSavingForm({ onDone }: { onDone: () => void }) {
  const goals = useApp((s) => s.goals.filter((g) => g.status === "active"));
  const addMoney = useApp((s) => s.addMoney);
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  if (goals.length === 0) {
    return <p className="text-text-secondary text-sm">אין לך עדיין יעד פעיל. צור יעד קודם.</p>;
  }

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0 || !goalId) return;
    setSaving(true);
    await addMoney(goalId, value);
    setSaving(false);
    onDone();
  }

  return (
    <div>
      <Field label="יעד">
        <div className="flex flex-col gap-2">
          {goals.map((g) => (
            <Chip key={g.id} selected={goalId === g.id} onClick={() => setGoalId(g.id)}>
              {g.emoji} {g.name}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="סכום להוספה">
        <input className={inputClass} inputMode="decimal" placeholder="₪ 0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Button className="w-full mt-2" onClick={submit} disabled={!amount || Number(amount) <= 0 || saving}>
        הוסף לחיסכון
      </Button>
    </div>
  );
}
