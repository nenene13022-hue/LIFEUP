import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button, Card } from "../../components/ui/primitives";
import { LogoMark } from "../../components/Logo";

const FEATURES = [
  "AI אישי מתקדם",
  "ניתוח ההוצאות שלך",
  "יעדים ללא הגבלה",
  "תחזיות פיננסיות",
  "תובנות חכמות",
  '"לפני שאתה קונה"',
];

export function PremiumScreen() {
  const navigate = useNavigate();

  return (
    <div className="pb-4 flex flex-col min-h-[calc(100vh-2rem)]">
      <button onClick={() => navigate(-1)} className="tap-scale mb-4 flex items-center gap-1 text-text-secondary text-sm">
        <ArrowRight size={16} />
        חזרה
      </button>

      <div className="flex flex-col items-center text-center mb-6">
        <LogoMark size={56} />
        <h1 className="text-2xl font-extrabold mt-4">
          LifeUp <span className="text-gradient">PRO</span>
        </h1>
        <p className="text-text-secondary mt-1">יותר שליטה. פחות לחץ.</p>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col gap-3.5">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                <Check size={14} className="text-black" />
              </div>
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex-1" />
      <p className="text-center text-text-muted text-xs mb-3">המחירים יתעדכנו בקרוב</p>
      <Button className="w-full" disabled>
        התחל Premium
      </Button>
    </div>
  );
}
