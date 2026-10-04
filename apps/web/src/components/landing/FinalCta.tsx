import Link from "next/link";
import { finalCta } from "@/config/site";

export function FinalCta() {
  return (
    <section className="py-[72px] md:py-[88px]">
      <div className="container-x">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[20px] border border-line bg-surface-2 px-6 py-10 sm:px-12 sm:py-14">
          <h2 className="max-w-[460px] text-[clamp(1.6rem,3vw,2.15rem)] font-semibold tracking-tight">{finalCta.title}</h2>
          <Link href={finalCta.cta.href} className="btn btn-primary">{finalCta.cta.label}</Link>
        </div>
      </div>
    </section>
  );
}
