"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Monitor, Pause, Play, Smartphone } from "lucide-react";
import { platformMedia, platformTour as copy, type PlatformView } from "@/config/site";

const views = [
  { id: "mobile", icon: Smartphone },
  { id: "desktop", icon: Monitor },
] as const;

const control = "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-muted";

/** Silent looping videos of the customer area, recorded by e2e/platform-videos.mjs. They only load and play while on screen. */
export function Platform() {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<PlatformView>("mobile");
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const total = copy.flows.length;
  const flow = copy.flows[index];
  const media = platformMedia(view, flow.id);
  const desktop = view === "desktop";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
    // Each visitor starts with the view of the screen they are using. Nothing has loaded yet: the section is off screen.
    if (window.matchMedia("(min-width: 1024px)").matches) setView("desktop");
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    // Browsers only autoplay muted videos, and React does not always set `muted` when hydrating.
    v.muted = true;
    if (visible && !paused) v.play().catch(() => undefined);
    else v.pause();
  }, [visible, paused, index, view]);

  return (
    <section id="plataforma" className="py-16">
      <div className="container-x grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr]">
        <div className="mb-2 lg:col-start-2">
          <span className="kicker">{copy.kicker}</span>
          <h2 className="section-title">{copy.title}</h2>
          <p className="mt-3.5 max-w-[58ch] text-[1.08rem] text-muted">{copy.sub}</p>
        </div>

        {/* Arrows sit with the text so the new title is on screen when they are pressed, on phones and short laptop screens too. */}
        <div className="flex items-center gap-3 lg:col-start-2">
          <button type="button" className={control} aria-label={copy.previous} onClick={() => setIndex((index - 1 + total) % total)}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <p className="min-w-[3.5rem] text-center text-[0.95rem] font-semibold tabular-nums" aria-live="polite">
            {copy.position(index + 1, total)}
          </p>
          <button type="button" className={control} aria-label={copy.next} onClick={() => setIndex((index + 1) % total)}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>
          <button type="button" className={`${control} ml-auto lg:ml-2`} aria-label={paused ? copy.play : copy.pause} onClick={() => setPaused((p) => !p)}>
            {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
          </button>
        </div>

        <ol className="min-h-[124px] lg:col-start-2 lg:min-h-0">
          {copy.flows.map((f, i) => (
            <li key={f.id} className={i === index ? "" : "max-lg:hidden"}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "true" : undefined}
                className={`w-full cursor-pointer rounded-2xl py-2.5 text-left transition-colors lg:px-5 ${i === index ? "lg:bg-surface-2" : "lg:hover:bg-surface-2/60"}`}
              >
                <span className={`block text-[1.12rem] font-bold ${i === index ? "text-ink" : "text-muted"}`}>{f.title}</span>
                {i === index && <span className="mt-1 block max-w-[56ch] text-muted">{f.text}</span>}
              </button>
            </li>
          ))}
        </ol>

        {/* Same panel for both views. From lg up it follows the screen height and fits below the sticky header. */}
        <div
          ref={frame}
          className="flex flex-col items-center gap-4 self-start overflow-hidden rounded-[26px] bg-surface-2 p-3 sm:p-5 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:min-h-[calc(var(--phone)*1.949+100px)] lg:[--phone:clamp(220px,calc((100dvh-235px)*0.513),310px)]"
        >
          <div role="group" aria-label={copy.viewLabel} className="inline-flex rounded-full bg-surface-3 p-1 text-[0.92rem]">
            {views.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 font-medium text-muted transition-colors aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgba(15,33,51,0.12)]"
              >
                <Icon size={17} aria-hidden="true" />
                {copy.views[id]}
              </button>
            ))}
          </div>
          <div className="grid w-full flex-1 place-items-center">
            <div className={`bg-navy shadow-[0_10px_26px_rgba(15,33,51,.2)] ${desktop ? "w-full rounded-[18px] p-1.5 sm:p-2" : "w-full max-w-[280px] rounded-[34px] p-2.5 lg:w-[var(--phone)] lg:max-w-none"}`}>
              <video
                key={`${view}-${flow.id}`}
                ref={video}
                src={media.video}
                poster={media.poster}
                aria-label={`${flow.title} (${copy.views[view]})`}
                muted
                loop
                playsInline
                preload="none"
                className={`w-full bg-surface object-cover ${desktop ? "aspect-[1100/700] rounded-xl" : "aspect-[390/760] rounded-3xl"}`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
