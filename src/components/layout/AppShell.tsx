import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav } from "./BottomNav";
import { QuickAddSheet } from "./QuickAddSheet";
import { FloatingOrbs } from "./FloatingOrbs";
import { useSwipeBack } from "../../hooks/useSwipeBack";

export function AppShell() {
  const location = useLocation();
  const { ref, x } = useSwipeBack<HTMLDivElement>();

  return (
    <div className="relative min-h-screen pb-28 overflow-hidden">
      <FloatingOrbs />
      <motion.div
        ref={ref}
        className="relative px-5 pt-6"
        style={{ x, paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <BottomNav />
      <QuickAddSheet />
    </div>
  );
}
