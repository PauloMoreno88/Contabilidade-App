import { services } from "@/config/site";
import { SectionHead } from "./SectionHead";

export function Services() {
  return (
    <section id="servicos" className="py-[72px] md:py-[88px]">
      <div className="container-x">
        <SectionHead title={services.title} sub={services.sub} />
        <ul className="grid gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-bg p-7">
              <Icon className="mb-4 text-brand" size={24} strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mb-2 text-[1.02rem] font-semibold">{title}</h3>
              <p className="text-[0.9rem] text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
