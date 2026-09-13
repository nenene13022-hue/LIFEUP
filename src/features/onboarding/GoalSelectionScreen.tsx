import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader, Chip, Button } from "../../components/ui/primitives";
import { GOAL_CATEGORIES } from "../../lib/constants";
import type { GoalCategory } from "../../lib/types/models";

export function GoalSelectionScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<GoalCategory[]>([]);

  function toggle(key: GoalCategory) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <ScreenHeader title="מה הכי חשוב לך כרגע?" subtitle="אפשר לבחור יותר מאפשרות אחת." />

      <div className="flex flex-wrap gap-3 mb-6">
        {GOAL_CATEGORIES.map((g) => (
          <Chip
            key={g.key}
            selected={selected.includes(g.key)}
            onClick={() => toggle(g.key)}
            className="flex flex-col items-center gap-2 py-5 text-center basis-[calc(50%-0.375rem)] grow-0"
          >
            <span className="text-2xl">{g.emoji}</span>
            <span>{g.label}</span>
          </Chip>
        ))}
      </div>

      <div className="flex-1" />
      <Button
        className="w-full"
        disabled={selected.length === 0}
        onClick={() => navigate("/onboarding/financial", { state: { goalTypes: selected } })}
      >
        המשך
        <ArrowLeft size={20} />
      </Button>
    </div>
  );
}
