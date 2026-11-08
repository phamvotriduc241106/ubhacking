import { Localized, LocalizedText } from "@/i18n/localized";
import { Badge } from "@/components/ui/badge";
import { EVIDENCE_LABEL } from "@/lib/recommendations";
import type { DataOrigin, EvidenceKind } from "@/lib/types";
import { useTranslation } from "react-i18next";

export function OriginBadge({ origin, className }: { origin: DataOrigin | undefined; className?: string }) {
  const { t } = useTranslation();
  if (origin === "user-reported") return <Badge variant="demo" className={className}>{t("manual_origin")}</Badge>;
  if (origin === "live") return <Badge variant="live" className={className}><Localized id="ui_c76620909de09bac" fallback="● Live" /></Badge>;
  if (origin === "backend-simulated") return <Badge variant="demo" className={className}><Localized id="ui_75b8d5db678a4f1b" fallback="Backend · simulated" /></Badge>;
  return <Badge variant="demo" className={className}><Localized id="ui_71ddd59aa6f1d209" fallback="Demo data" /></Badge>;
}

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
  const e = EVIDENCE_LABEL[kind];
  return <Badge variant={e.real ? "live" : "demo"}>{e.real ? "●" : "◌"} <LocalizedText text={e.label} /></Badge>;
}
