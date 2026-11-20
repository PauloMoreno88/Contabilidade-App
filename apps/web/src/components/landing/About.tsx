import { FileText, MessageSquare } from "lucide-react";
import { about, images } from "@/config/site";

/** Trust numbers and a mosaic: photo, two short cards and a wide navy card. */
export function About() {
  return (
    <section id="sobre" className="py-16 md:py-24">
      <div className="container-x">
        <div className="mb-11 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
          <div>
            <span className="kicker">{about.kicker}</span>
            <h2 className="section-title">{about.title}</h2>
          </div>
          <ul className="flex flex-wrap gap-x-11 gap-y-6">
            {about.stats.map((s) => (
              <li key={s.label}>
                <p className="font-serif text-[2.3rem] leading-none font-semibold tabular-nums md:text-[3rem]">
                  {s.value}
                  {s.suffix && <sup className="ml-0.5 text-[0.5em] text-brand">{s.suffix}</sup>}
                </p>
                <p className="mt-1.5 text-[0.9rem] text-faint">{s.label}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-[18px] md:grid-cols-2 lg:grid-cols-[1.05fr_1fr_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images.about.src}
            alt={images.about.alt}
            className="h-[300px] w-full rounded-2xl object-cover md:col-span-2 lg:col-span-1 lg:row-span-2 lg:h-full lg:min-h-[440px]"
          />
          <div className="flex flex-col gap-2.5 rounded-2xl bg-surface-2 p-[26px]">
            <span className="mb-1.5 grid size-[38px] place-items-center rounded-[10px] bg-white text-brand">
              <FileText size={20} aria-hidden="true" />
            </span>
            <h3 className="font-serif text-[1.35rem] font-semibold">{about.simple.title}</h3>
            <p className="text-[0.97rem] text-muted">{about.simple.text}</p>
          </div>
          <div className="flex flex-col gap-2.5 rounded-2xl bg-brand p-[26px] text-white">
            <span className="mb-1.5 grid size-[38px] place-items-center rounded-[10px] bg-white/[.18]">
              <MessageSquare size={20} aria-hidden="true" />
            </span>
            <h3 className="font-serif text-[1.35rem] font-semibold">{about.human.title}</h3>
            <p className="text-[0.97rem] text-[#fbdde0]">{about.human.text}</p>
          </div>
          <div className="relative flex flex-col gap-2.5 overflow-hidden rounded-2xl bg-navy p-[26px] text-white md:col-span-2">
            <span className="pointer-events-none absolute -bottom-[90px] -right-[60px] size-[260px] rounded-full border-[38px] border-white/5" aria-hidden="true" />
            <h3 className="relative font-serif text-[1.35rem] font-semibold">{about.focus.title}</h3>
            <p className="relative max-w-[52ch] text-on-navy">{about.focus.text}</p>
            <a href={about.focus.link.href} className="relative mt-auto pt-2 font-semibold underline underline-offset-4">
              {about.focus.link.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
