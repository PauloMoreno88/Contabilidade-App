import { SIMULATOR_DISCLAIMER } from "@exactra/shared";

export function Disclaimer({ className = "" }: { className?: string }) {
  return <p className={`border-l-2 border-line pl-3 text-[0.8rem] text-faint ${className}`}>{SIMULATOR_DISCLAIMER}</p>;
}
