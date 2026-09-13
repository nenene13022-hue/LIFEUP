import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Crown, X, Plus } from "lucide-react";
import { ScreenHeader, Card, Button, Field, inputClass } from "../../components/ui/primitives";
import { Sheet } from "../../components/ui/Sheet";
import { useApp } from "../../state/store";
import { applyTheme, getTheme, type Theme } from "../../lib/theme";
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, maskApiKey } from "../../lib/ai/apiKeyStore";
import { getQuickReplies, setQuickReplies, resetQuickReplies, DEFAULT_QUICK_REPLIES } from "../../lib/ai/quickReplies";

function Row({
  emoji,
  label,
  value,
  onClick,
  toggle,
  onToggle,
  danger,
}: {
  emoji: string;
  label: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={
        "w-full flex items-center gap-3 py-3.5 text-start" +
        (onClick ? " tap-scale" : "") +
        (danger ? " text-negative" : "")
      }
    >
      <span className="text-lg w-6 text-center">{emoji}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {onToggle !== undefined ? (
        <Switch checked={!!toggle} onChange={onToggle} />
      ) : (
        <>
          {value && <span className="text-text-secondary text-xs">{value}</span>}
          {onClick && <ChevronLeft size={16} className={danger ? "text-negative" : "text-text-muted"} />}
        </>
      )}
    </Wrapper>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={
        "w-11 h-6 rounded-full relative tap-scale transition-colors " + (checked ? "bg-gradient-brand" : "bg-surface-3")
      }
      aria-pressed={checked}
    >
      <span
        className={
          "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (checked ? "start-[calc(100%-1.375rem)]" : "start-0.5")
        }
      />
    </button>
  );
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const user = useApp((s) => s.user);
  const logout = useApp((s) => s.logout);
  const exportExcel = useApp((s) => s.exportExcel);
  const importExcelFile = useApp((s) => s.importExcelFile);
  const exportBackup = useApp((s) => s.exportBackup);
  const restoreFromBackupFile = useApp((s) => s.restoreFromBackupFile);
  const deleteAllData = useApp((s) => s.deleteAllData);

  const [theme, setTheme] = useState<Theme>(getTheme());
  const [notifOn, setNotifOn] = useState(() => {
    try {
      return localStorage.getItem("lifeup-notifications-enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [infoSheet, setInfoSheet] = useState<null | "privacy" | "terms" | "about">(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [apiKeySheetOpen, setApiKeySheetOpen] = useState(false);
  const [storedKey, setStoredKey] = useState<string | null>(() => getStoredApiKey());
  const [apiKeyInput, setApiKeyInput] = useState("");

  const [quickRepliesSheetOpen, setQuickRepliesSheetOpen] = useState(false);
  const [quickRepliesDraft, setQuickRepliesDraft] = useState<string[]>([]);
  const [newQuickReply, setNewQuickReply] = useState("");

  const excelInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleNotif(v: boolean) {
    setNotifOn(v);
    try {
      localStorage.setItem("lifeup-notifications-enabled", String(v));
    } catch {
      /* ignore */
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  async function handleExcelFileSelected(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { expensesAdded, incomeAdded } = await importExcelFile(file);
      setResultMessage(`יובאו בהצלחה ${expensesAdded} הוצאות ו-${incomeAdded} הכנסות.`);
    } catch (err) {
      setResultMessage("לא הצלחנו לקרוא את הקובץ. ודא שזה קובץ Excel שיוצא מ-LifeUp.");
    } finally {
      setBusy(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  }

  async function handleRestoreFileSelected(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await restoreFromBackupFile(file);
      setResultMessage("השחזור הושלם בהצלחה. כל הנתונים חזרו.");
    } catch (err) {
      setResultMessage(err instanceof Error ? err.message : "לא הצלחנו לשחזר מהקובץ הזה.");
    } finally {
      setBusy(false);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  }

  function openApiKeySheet() {
    setApiKeyInput("");
    setApiKeySheetOpen(true);
  }

  function saveApiKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setStoredApiKey(trimmed);
    setStoredKey(trimmed);
    setApiKeySheetOpen(false);
  }

  function removeApiKey() {
    clearStoredApiKey();
    setStoredKey(null);
    setApiKeySheetOpen(false);
  }

  function openQuickRepliesSheet() {
    setQuickRepliesDraft(getQuickReplies());
    setNewQuickReply("");
    setQuickRepliesSheetOpen(true);
  }

  function updateQuickReplyDraft(index: number, value: string) {
    setQuickRepliesDraft((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function removeQuickReplyDraft(index: number) {
    setQuickRepliesDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function addQuickReplyDraft() {
    const trimmed = newQuickReply.trim();
    if (!trimmed) return;
    setQuickRepliesDraft((prev) => [...prev, trimmed]);
    setNewQuickReply("");
  }

  function saveQuickReplies() {
    setQuickReplies(quickRepliesDraft);
    setQuickRepliesSheetOpen(false);
  }

  function resetQuickRepliesToDefault() {
    resetQuickReplies();
    setQuickRepliesDraft(DEFAULT_QUICK_REPLIES);
  }

  async function handleDeleteAll() {
    setBusy(true);
    await deleteAllData();
    setBusy(false);
    setDeleteConfirmOpen(false);
    navigate("/");
  }

  return (
    <div className="pb-4">
      <ScreenHeader title="הגדרות" />

      <Card className="mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-brand text-black flex items-center justify-center font-bold text-lg">
          {(user?.name || "מ")[0]}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{user?.name}</p>
          <p className="text-text-secondary text-xs">{user?.email}</p>
        </div>
      </Card>

      <button
        onClick={() => navigate("/premium")}
        className="tap-scale w-full mb-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-brand text-black"
      >
        <Crown size={20} />
        <span className="flex-1 text-start font-semibold text-sm">LifeUp PRO — יותר שליטה, פחות לחץ</span>
        <ChevronLeft size={16} />
      </button>

      <Card className="mb-4 divide-y divide-border">
        <Row emoji="👤" label="פרופיל" onClick={() => navigate("/settings/profile")} />
        <Row emoji="💰" label="הגדרות פיננסיות" onClick={() => navigate("/settings/profile")} />
        <Row emoji="🎯" label="היעדים שלי" onClick={() => navigate("/goals")} />
        <Row emoji="🔔" label="התראות" toggle={notifOn} onToggle={toggleNotif} />
        <Row emoji="🌙" label="Dark Mode" toggle={theme === "dark"} onToggle={(v) => setTheme(v ? "dark" : "light")} />
        <Row
          emoji="🔑"
          label="מפתח AI (Gemini)"
          value={storedKey ? maskApiKey(storedKey) : "משותף (ברירת מחדל)"}
          onClick={openApiKeySheet}
        />
        <Row emoji="⚡" label="תשובות מהירות ב-AI" onClick={openQuickRepliesSheet} />
        <Row emoji="🌐" label="שפה" value="עברית" />
        <Row emoji="₪" label="מטבע" value="שקל (₪)" />
        <Row emoji="🔐" label="פרטיות ואבטחה" onClick={() => setInfoSheet("privacy")} />
        <Row emoji="📄" label="תנאי שימוש" onClick={() => setInfoSheet("terms")} />
        <Row emoji="ℹ️" label="אודות" onClick={() => setInfoSheet("about")} />
      </Card>

      <p className="text-text-secondary text-sm font-medium mb-2 px-1">ניהול נתונים</p>
      <Card className="mb-4 divide-y divide-border">
        <Row emoji="🧾" label="דוח PDF חודשי" onClick={() => navigate("/settings/report")} />
        <Row emoji="📊" label="ייצוא נתונים ל-Excel" onClick={exportExcel} />
        <Row emoji="📥" label="ייבוא מ-Excel" onClick={() => excelInputRef.current?.click()} />
        <Row emoji="💾" label="גיבוי (הורדת קובץ)" onClick={exportBackup} />
        <Row emoji="♻️" label="שחזור מגיבוי" onClick={() => restoreInputRef.current?.click()} />
        <Row emoji="🗑️" label="מחיקת כל הנתונים" danger onClick={() => setDeleteConfirmOpen(true)} />
      </Card>
      <p className="text-text-muted text-xs mb-4 px-1 leading-relaxed">
        מומלץ להוריד גיבוי מדי פעם — כל הנתונים נשמרים רק במכשיר הזה, ואם ימחקו בטעות ניתן לשחזר מקובץ הגיבוי.
      </p>

      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handleExcelFileSelected(e.target.files?.[0])}
      />
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => handleRestoreFileSelected(e.target.files?.[0])}
      />

      <button onClick={handleLogout} className="tap-scale w-full flex items-center gap-3 py-3.5 text-negative">
        <LogOut size={18} />
        <span className="text-sm font-medium">התנתקות</span>
      </button>

      <Sheet
        open={infoSheet !== null}
        onClose={() => setInfoSheet(null)}
        title={infoSheet === "privacy" ? "פרטיות ואבטחה" : infoSheet === "terms" ? "תנאי שימוש" : "אודות LifeUp"}
      >
        <div className="text-sm text-text-secondary leading-relaxed space-y-3">
          {infoSheet === "privacy" && (
            <>
              <p>הנתונים הפיננסיים שלך נשמרים מקומית במכשיר שלך בלבד ולא נשלחים לשרת חיצוני בגרסה הנוכחית.</p>
              <p>בשלב זה אין חיבור ישיר לחשבון הבנק — כל הנתונים מוזנים ידנית.</p>
            </>
          )}
          {infoSheet === "terms" && <p>LifeUp הוא כלי לניהול תקציב אישי ואינו מהווה ייעוץ פיננסי מקצועי. השימוש באפליקציה על אחריות המשתמש בלבד.</p>}
          {infoSheet === "about" && (
            <>
              <p className="font-semibold text-text-primary">LifeUp — החיים שלך. בשליטה שלך.</p>
              <p>עוזר אישי חכם לניהול כסף, הוצאות ויעדים. גרסת MVP.</p>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="למחוק את כל הנתונים?">
        <div className="text-sm text-text-secondary leading-relaxed mb-5">
          <p className="mb-2">
            פעולה זו תמחק לצמיתות את כל ההוצאות, ההכנסות, היעדים והפרופיל הפיננסי שלך מהמכשיר הזה. אי אפשר לבטל את זה.
          </p>
          <p>אם לא הורדת גיבוי לאחרונה — עדיף לבטל, ללחוץ "גיבוי (הורדת קובץ)" קודם, ואז לחזור לכאן.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="danger" className="w-full" onClick={handleDeleteAll} disabled={busy}>
            כן, מחק את הכל
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setDeleteConfirmOpen(false)}>
            ביטול
          </Button>
        </div>
      </Sheet>

      <Sheet open={apiKeySheetOpen} onClose={() => setApiKeySheetOpen(false)} title="מפתח AI (Gemini)">
        <div className="text-sm text-text-secondary leading-relaxed mb-4 space-y-2">
          <p>
            LifeUp כבר מוגדר עם מפתח Gemini משותף כדי שה-AI יעבוד מיד. אם תרצה להשתמש במפתח האישי שלך (למשל כדי
            שהשימוש ייספר על המכסה שלך ולא על המכסה המשותפת) — אפשר להדביק אותו כאן. המפתח נשמר{" "}
            <span className="text-text-primary font-medium">רק בדפדפן שלך</span> ונשלח לשרת של LifeUp רק כדי להעביר
            אותו הלאה ל-Gemini. שינוי או הסרה שלו לא ימחקו שום שיחה או נתון קיים.
          </p>
          {storedKey && <p className="text-text-primary text-xs">המפתח הנוכחי: {maskApiKey(storedKey)}</p>}
        </div>
        <Field label="מפתח Gemini API חדש">
          <input
            className={inputClass + " font-mono text-xs"}
            placeholder="AIza... או AQ..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <div className="flex flex-col gap-2 mt-2">
          <Button className="w-full" onClick={saveApiKey} disabled={!apiKeyInput.trim()}>
            שמור מפתח
          </Button>
          {storedKey && (
            <Button variant="secondary" className="w-full" onClick={removeApiKey}>
              הסר מפתח
            </Button>
          )}
        </div>
        <p className="text-text-muted text-xs mt-4 leading-relaxed">
          אין לך מפתח? אפשר ליצור אחד בחינם ב-Google AI Studio (aistudio.google.com) עם חשבון Google.
        </p>
      </Sheet>

      <Sheet open={quickRepliesSheetOpen} onClose={() => setQuickRepliesSheetOpen(false)} title="תשובות מהירות ב-AI">
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          אלה הכפתורים שמופיעים תמיד מעל שורת ההודעה בצ'אט עם ה-AI. אפשר לערוך, להסיר ולהוסיף לפי מה שהכי שימושי לך.
        </p>
        <div className="flex flex-col gap-2 mb-3">
          {quickRepliesDraft.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={inputClass + " h-11 text-sm"}
                value={q}
                onChange={(e) => updateQuickReplyDraft(i, e.target.value)}
              />
              <button
                onClick={() => removeQuickReplyDraft(i)}
                className="tap-scale w-11 h-11 rounded-2xl bg-surface-2 border border-border flex items-center justify-center shrink-0 text-negative"
                aria-label="הסר"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {quickRepliesDraft.length === 0 && (
            <p className="text-text-muted text-xs text-center py-3">אין תשובות מהירות כרגע.</p>
          )}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <input
            className={inputClass + " h-11 text-sm"}
            placeholder="תשובה מהירה חדשה..."
            value={newQuickReply}
            onChange={(e) => setNewQuickReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addQuickReplyDraft();
            }}
          />
          <button
            onClick={addQuickReplyDraft}
            disabled={!newQuickReply.trim()}
            className="tap-scale w-11 h-11 rounded-2xl bg-gradient-brand text-black flex items-center justify-center shrink-0 disabled:opacity-40"
            aria-label="הוסף"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={saveQuickReplies}>
            שמור
          </Button>
          <Button variant="secondary" className="w-full" onClick={resetQuickRepliesToDefault}>
            אפס לברירת מחדל
          </Button>
        </div>
      </Sheet>

      <Sheet open={resultMessage !== null} onClose={() => setResultMessage(null)} title="עדכון">
        <p className="text-sm text-text-secondary leading-relaxed mb-4">{resultMessage}</p>
        <Button className="w-full" onClick={() => setResultMessage(null)}>
          סגור
        </Button>
      </Sheet>
    </div>
  );
}
