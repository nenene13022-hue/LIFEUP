import { NavLink } from "react-router-dom";
import { Home, CreditCard, Target, Bot, Plus } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../state/store";

const items = [
  { to: "/home", icon: Home, label: "בית" },
  { to: "/expenses", icon: CreditCard, label: "הוצאות" },
  { to: "/goals", icon: Target, label: "יעדים" },
  { to: "/ai", icon: Bot, label: "AI" },
];

export function BottomNav() {
  const setQuickAddOpen = useApp((s) => s.setQuickAddOpen);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[480px]">
      <div className="relative bg-surface/95 backdrop-blur border-t border-border px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center justify-center gap-1 py-2 rounded-xl tap-scale",
                  isActive ? "text-text-primary" : "text-text-muted"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? "text-gradient" : undefined} style={isActive ? { color: "var(--color-brand-from)" } : undefined} />
                  <span className="text-[11px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <button
          onClick={() => setQuickAddOpen(true)}
          aria-label="הוסף"
          className="tap-scale absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-brand shadow-glow flex items-center justify-center text-black"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
