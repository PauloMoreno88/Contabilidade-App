import type { ContractStatus } from "@exactra/shared";
import { statusLabels } from "@/config/admin";

const tone: Record<ContractStatus, string> = {
  ACTIVE: "bg-wa/15 text-[#13723a]",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAST_DUE: "bg-brand/10 text-brand-dark",
  CANCELED: "bg-surface-3 text-muted",
  EXPIRED: "bg-surface-3 text-muted",
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.78rem] font-medium ${tone[status]}`}>{statusLabels[status]}</span>;
}
