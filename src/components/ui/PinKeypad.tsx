import { motion } from "framer-motion";
import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinDots({ length, filled, error }: { length: number; filled: number; error?: boolean }) {
  return (
    <motion.div
      className="flex items-center justify-center gap-4"
      animate={error ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {Array.from({ length }).map((_, i) => (
        <span
          key={i}
          className={
            "w-3.5 h-3.5 rounded-full border transition-colors " +
            (i < filled
              ? error
                ? "bg-negative border-negative"
                : "bg-gradient-brand border-transparent"
              : "border-text-muted")
          }
        />
      ))}
    </motion.div>
  );
}

export function PinKeypad({ onDigit, onBackspace }: { onDigit: (d: string) => void; onBackspace: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto">
      {KEYS.map((k, i) =>
        k === "" ? (
          <div key={i} />
        ) : k === "back" ? (
          <button
            key={i}
            onClick={onBackspace}
            className="tap-scale h-16 rounded-full flex items-center justify-center text-text-secondary"
            aria-label="מחק"
          >
            <Delete size={22} />
          </button>
        ) : (
          <button
            key={i}
            onClick={() => onDigit(k)}
            className="tap-scale h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xl font-semibold"
          >
            {k}
          </button>
        )
      )}
    </div>
  );
}
