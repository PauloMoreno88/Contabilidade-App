import { testimonials as copy } from "@/config/site";

/** Rating summary and quotes. Initials instead of faces: no photos of people. */
export function Testimonials() {
  return (
    <section className="bg-surface-2 py-16 md:py-24">
      <div className="container-x">
        <div className="mb-11">
          <span className="kicker">{copy.kicker}</span>
          <h2 className="section-title">{copy.title}</h2>
        </div>
        <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,.8fr)_minmax(0,2fr)] lg:gap-12">
          <div className="rounded-[22px] bg-white p-[30px]">
            <p className="font-serif text-[4rem] leading-none font-semibold">{copy.score.value}</p>
            <p className="mt-2 text-[1.3rem] tracking-[2px] text-star" aria-hidden="true">★★★★★</p>
            <p className="mt-1.5 text-faint">{copy.score.text}</p>
            <div className="mt-5 flex" aria-hidden="true">
              {copy.items.map((t, i) => (
                <span
                  key={t.initials}
                  className={`-ml-2.5 grid size-[42px] place-items-center rounded-full border-[3px] border-white text-[0.85rem] font-bold text-white first:ml-0 ${i % 2 ? "bg-brand" : "bg-navy"}`}
                >
                  {t.initials}
                </span>
              ))}
            </div>
          </div>
          <ul className="grid gap-[18px] md:grid-cols-3">
            {copy.items.map((t) => (
              <li key={t.initials}>
                <figure className="flex h-full flex-col gap-[18px] rounded-[22px] bg-white p-[26px]">
                  <span className="tracking-[2px] text-star" aria-label="5 de 5 estrelas">★★★★★</span>
                  <blockquote className="text-muted">“{t.quote}”</blockquote>
                  <figcaption className="mt-auto flex items-center gap-3">
                    <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-surface-2 font-bold text-navy" aria-hidden="true">
                      {t.initials}
                    </span>
                    <span>
                      <b className="block text-[0.95rem]">{t.name}</b>
                      <small className="text-faint">{t.role}</small>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
