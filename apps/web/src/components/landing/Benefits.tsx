import { benefits } from "@/config/site";
import { SectionHead } from "./SectionHead";

export function Benefits() {
  return (
    <section className="py-[72px] md:py-[88px]">
      <div className="container-x">
        <SectionHead title={benefits.title} />
        <ul className="border-t border-line">
          {benefits.items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="grid grid-cols-[40px_1fr] items-start gap-5 border-b border-line py-[26px]">
              <Icon className="mt-0.5 text-brand" size={26} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <h3 className="mb-1 text-[1.05rem] font-semibold">{title}</h3>
                <p className="max-w-[520px] text-[0.94rem] text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
