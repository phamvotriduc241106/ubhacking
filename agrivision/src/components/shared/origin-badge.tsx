import { Badge } from "@/components/ui/badge";
import { EVIDENCE_LABEL } from "@/lib/recommendations";
import type { DataOrigin, EvidenceKind } from "@/lib/types";

export function OriginBadge({ origin, className }: { origin: DataOrigin | undefined; className?: string }) {
  if (origin === "live") return <Badge variant="live" className={className}>● Live</Badge>;
  if (origin === "backend-simulated") return <Badge variant="demo" className={className}>Backend · simulated</Badge>;
  if (origin === "manual") return <Badge variant="demo" className={className}>Manually entered</Badge>;
  if (!origin || origin === "unavailable") return <Badge variant="demo" className={className}>Source unavailable</Badge>;
  return <Badge variant="demo" className={className}>Demo data</Badge>;
}

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
  const e = EVIDENCE_LABEL[kind];
  return <Badge variant={e.real ? "live" : "demo"}>{e.real ? "●" : "◌"} {e.label}</Badge>;
}
