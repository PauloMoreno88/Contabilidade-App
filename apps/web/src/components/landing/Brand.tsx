import Link from "next/link";

/** `dark`: on a navy background (the site header). */
export function Brand({ href = "/", dark = false }: { href?: string; dark?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className={`grid size-10 place-items-center rounded-[10px] p-[7px] ${dark ? "bg-navy-2 ring-1 ring-white/15" : "bg-navy"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trace.svg" alt="" className="h-auto w-full" />
      </span>
      <span className="leading-none">
        <span className={`block font-serif text-[1.4rem] font-bold tracking-[-0.02em] ${dark ? "text-white" : ""}`}>Exactra</span>
        <span className={`mt-0.5 block text-[0.7rem] tracking-[0.04em] ${dark ? "text-on-navy-faint" : "text-faint"}`}>Contabilidade</span>
      </span>
    </Link>
  );
}
