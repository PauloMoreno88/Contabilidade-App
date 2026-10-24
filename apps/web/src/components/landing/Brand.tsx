import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-[10px] bg-navy p-[7px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trace.svg" alt="" className="h-auto w-full" />
      </span>
      <span className="leading-none">
        <span className="block font-serif text-[1.4rem] font-bold tracking-[-0.02em]">Exactra</span>
        <span className="mt-0.5 block text-[0.7rem] tracking-[0.04em] text-faint">Contabilidade</span>
      </span>
    </Link>
  );
}
