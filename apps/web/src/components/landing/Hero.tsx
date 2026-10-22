import { MessageCircle } from "lucide-react";
import { hero, images, whatsappLink } from "@/config/site";

/** Navy hero with a photo on the right. The simulator card overlaps its bottom edge. */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 opacity-35 md:left-auto md:w-[52%] md:opacity-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images.hero.src} alt={images.hero.alt} className="size-full object-cover object-[30%_center]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,33,51,.4),var(--color-navy))] md:bg-[linear-gradient(90deg,var(--color-navy)_0%,rgba(15,33,51,.55)_35%,rgba(15,33,51,.05)_70%)]" />
      </div>
      <div className="container-x relative pb-[150px] pt-11 md:pb-[190px] md:pt-[88px]">
        <div className="max-w-[590px]">
          <p className="inline-flex flex-wrap items-center gap-2.5 rounded-full border border-white/15 bg-white/[.08] py-1.5 pl-2 pr-3.5 text-[0.88rem] text-on-navy">
            <span className="tracking-[1px] text-star" aria-hidden="true">★★★★★</span>
            <span>
              <b className="text-white">{hero.rating.value}</b> {hero.rating.text}
            </span>
          </p>
          <h1 className="mt-[22px] font-serif text-[clamp(2.3rem,5.2vw,4rem)] leading-[1.05] font-semibold tracking-[-0.01em]">{hero.title}</h1>
          <p className="mt-5 max-w-[58ch] text-[1.05rem] text-on-navy md:text-[1.15rem]">{hero.lede}</p>
          <div className="mt-8 hidden flex-wrap gap-3 sm:flex">
            <a href={hero.primaryCta.href} className="btn btn-primary">{hero.primaryCta.label}</a>
            <a href={whatsappLink()} target="_blank" rel="noopener" className="btn btn-ghost-dark">
              <MessageCircle size={18} aria-hidden="true" />
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
