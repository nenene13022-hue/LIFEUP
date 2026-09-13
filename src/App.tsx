import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "./state/store";
import { LogoMark } from "./components/Logo";
import { AppShell } from "./components/layout/AppShell";
import { PinUnlockScreen } from "./features/lock/PinUnlockScreen";
import { hasPinSet } from "./lib/security/pinLock";

import { WelcomeScreen } from "./features/onboarding/WelcomeScreen";
import { SignupScreen } from "./features/onboarding/SignupScreen";
import { GoalSelectionScreen } from "./features/onboarding/GoalSelectionScreen";
import { FinancialProfileScreen } from "./features/onboarding/FinancialProfileScreen";
import { CreateGoalScreen } from "./features/goals/CreateGoalScreen";
import { HomeScreen } from "./features/dashboard/HomeScreen";
import { ExpensesScreen } from "./features/expenses/ExpensesScreen";
import { GoalsScreen } from "./features/goals/GoalsScreen";
import { GoalDetailScreen } from "./features/goals/GoalDetailScreen";
import { AIChatScreen } from "./features/ai/AIChatScreen";
import { BeforeYouBuyScreen } from "./features/beforeyoubuy/BeforeYouBuyScreen";
import { FinancialHealthScreen } from "./features/insights/FinancialHealthScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { ProfileScreen } from "./features/settings/ProfileScreen";
import { MonthlyReportScreen } from "./features/settings/MonthlyReportScreen";

function SplashLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pop">
        <LogoMark size={64} />
      </div>
    </div>
  );
}

function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const userId = useApp((s) => s.userId);
  const profile = useApp((s) => s.profile);

  if (!userId) return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/onboarding/financial" replace />;
  return <>{children}</>;
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const userId = useApp((s) => s.userId);
  if (!userId) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  const [unlocked, setUnlocked] = useState(() => !hasPinSet());

  useEffect(() => {
    init();
  }, [init]);

  if (!ready) return <SplashLoading />;
  if (!unlocked) return <PinUnlockScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route
        path="/onboarding/goals"
        element={
          <RequireUser>
            <GoalSelectionScreen />
          </RequireUser>
        }
      />
      <Route
        path="/onboarding/financial"
        element={
          <RequireUser>
            <FinancialProfileScreen />
          </RequireUser>
        }
      />
      <Route
        path="/onboarding/create-goal"
        element={
          <RequireUser>
            <CreateGoalScreen />
          </RequireUser>
        }
      />

      <Route
        element={
          <RequireOnboarded>
            <AppShell />
          </RequireOnboarded>
        }
      >
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/expenses" element={<ExpensesScreen />} />
        <Route path="/goals" element={<GoalsScreen />} />
        <Route path="/goals/new" element={<CreateGoalScreen />} />
        <Route path="/goals/:id" element={<GoalDetailScreen />} />
        <Route path="/ai" element={<AIChatScreen />} />
        <Route path="/before-you-buy" element={<BeforeYouBuyScreen />} />
        <Route path="/financial-health" element={<FinancialHealthScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/settings/profile" element={<ProfileScreen />} />
      </Route>

      <Route
        path="/settings/report"
        element={
          <RequireOnboarded>
            <MonthlyReportScreen />
          </RequireOnboarded>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
