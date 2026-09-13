import { motion, useReducedMotion } from "framer-motion";

// Purely decorative ambient background — soft blurred brand-gradient orbs that
// drift slowly. Never gates visible content (unlike WelcomeScreen's critical
// text, which had to move off framer-motion because a backgrounded tab can
// pause the animation mid-frame), so a paused/skipped animation here is harmless.
//
// Deliberately no z-index here (not even a small positive one): a *negative*
// z-index pulled these out of the parent's local stacking order entirely and
// rendered them behind the page background instead of behind the sibling
// content — plain DOM order (this renders first) is what keeps it visually
// behind later siblings. `left`/`right` are used instead of the inset-inline-*
// logical properties so placement doesn't flip under the app's dir="rtl".
export function FloatingOrbs() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute w-80 h-80 rounded-full opacity-45 blur-2xl"
        style={{
          background: "radial-gradient(circle, var(--color-brand-from), transparent 65%)",
          top: "-6rem",
          left: "-5rem",
        }}
        animate={reduceMotion ? undefined : { x: [0, 24, -12, 0], y: [0, 18, -12, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-72 h-72 rounded-full opacity-40 blur-2xl"
        style={{
          background: "radial-gradient(circle, var(--color-brand-to), transparent 65%)",
          bottom: "6rem",
          right: "-4.5rem",
        }}
        animate={reduceMotion ? undefined : { x: [0, -18, 10, 0], y: [0, -14, 16, 0] }}
        transition={{ duration: 23, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="absolute w-56 h-56 rounded-full opacity-25 blur-2xl"
        style={{
          background: "radial-gradient(circle, var(--color-brand-from), transparent 65%)",
          top: "38%",
          left: "30%",
        }}
        animate={reduceMotion ? undefined : { x: [0, 14, -14, 0], y: [0, -10, 10, 0] }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}
