import { why } from "@/config/site";
import { SectionHead } from "./SectionHead";

export function Why() {
  return (
    <section className="py-[72px] md:py-[88px]">
      <div className="container-x">
        <SectionHead title={why.title} />
        <ul className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {why.items.map((w) => (
            <li key={w.title} className="border-t border-line pt-4">
              <h3 className="mb-1.5 font-semibold">{w.title}</h3>
              <p className="text-[0.9rem] text-muted">{w.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
