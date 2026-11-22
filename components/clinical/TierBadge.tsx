import { Siren, TriangleAlert, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TriageTier } from "@/lib/types";

const LABEL: Record<TriageTier, string> = { routine: "Routine", urgent: "Urgent", emergency: "Emergency" };
const ICON = { routine: CircleCheck, urgent: TriangleAlert, emergency: Siren };

export default function TierBadge({ tier, className }: { tier: TriageTier; className?: string }) {
  const Icon = ICON[tier];
  return (
    <Badge variant={tier} className={className}>
      <Icon aria-hidden="true" />
      {LABEL[tier]}
    </Badge>
  );
}

export function ScoreBar({ score, tier }: { score: number; tier: TriageTier }) {
  const color = tier === "emergency" ? "bg-crimson" : tier === "urgent" ? "bg-amber-500" : "bg-emerald-600";
  return (
    <div className="flex items-center gap-2" title={`Urgency score ${score}/100`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{score}</span>
    </div>
  );
}
