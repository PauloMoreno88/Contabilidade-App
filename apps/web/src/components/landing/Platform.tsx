"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { platformTour as copy } from "@/config/site";

const control = "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-muted";

/** Silent looping videos of the customer area, recorded by e2e/platform-videos.mjs. They only load and play while on screen. */
export function Platform() {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const total = copy.flows.length;
  const flow = copy.flows[index];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
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
  }, [visible, paused, index]);

  return (
    <section id="plataforma" className="py-16 md:py-24">
      <div className="container-x grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:grid-rows-[auto_auto_1fr]">
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

        {/* From lg up the phone follows the screen height, so all of it fits below the sticky header. */}
        <div
          ref={frame}
          className="w-[280px] justify-self-center rounded-[34px] bg-navy p-2.5 shadow-[0_30px_60px_rgba(15,33,51,.28)] lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:w-[clamp(240px,calc((100dvh-212px)*0.513),310px)] lg:self-start"
        >
          <video
            key={flow.id}
            ref={video}
            src={flow.video}
            poster={flow.poster}
            aria-label={flow.title}
            muted
            loop
            playsInline
            preload="none"
            className="aspect-[390/760] w-full rounded-3xl bg-surface object-cover"
          />
        </div>
      </div>
    </section>
  );
}
