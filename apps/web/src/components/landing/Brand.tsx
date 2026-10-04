import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="inline-flex items-center rounded-md bg-ink px-[7px] py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trace.svg" alt="Exactra Contabilidade" className="h-[26px] w-auto" />
      </span>
      <span className="text-[0.98rem] font-semibold">Exactra</span>
    </Link>
  );
}
