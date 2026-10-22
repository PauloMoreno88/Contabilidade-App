import { services } from "@/config/site";

export function Services() {
  return (
    <section id="servicos" className="bg-surface-2 py-16 md:py-24">
      <div className="container-x">
        <div className="mb-12">
          <span className="kicker">{services.kicker}</span>
          <h2 className="section-title">{services.title}</h2>
          <p className="mt-3.5 max-w-[58ch] text-[1.08rem] text-muted">{services.sub}</p>
        </div>
        <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="grid grid-cols-[52px_minmax(0,1fr)] gap-4">
                <span className="grid size-[52px] place-items-center rounded-[14px] bg-white text-brand shadow-[0_1px_0_var(--color-line)]">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[1.08rem] font-bold">{s.title}</h3>
                  <p className="mt-1 text-[0.95rem] text-muted">{s.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
