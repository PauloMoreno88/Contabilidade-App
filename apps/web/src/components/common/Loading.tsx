import { feedbackCopy } from "@/config/feedback";

export function Loading({ label = feedbackCopy.loading, compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div role="status" className={`flex items-center gap-3 text-[0.9rem] text-muted ${compact ? "py-2" : "min-h-32 justify-center p-6"}`}>
      <span className="loading-spinner text-brand" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
