import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { QuickAddSheet } from "./QuickAddSheet";

export function AppShell() {
  return (
    <div className="min-h-screen pb-28">
      <div className="px-5 pt-6" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
        <Outlet />
      </div>
      <BottomNav />
      <QuickAddSheet />
    </div>
  );
}
