import { SIMULATOR_DISCLAIMER } from "@exactra/shared";

export function Disclaimer({ className = "" }: { className?: string }) {
  return <span className={className}>{SIMULATOR_DISCLAIMER}</span>;
}
