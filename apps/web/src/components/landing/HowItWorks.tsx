import { howItWorks } from "@/config/site";
import { SectionHead } from "./SectionHead";
import { StepList } from "./StepList";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-[72px] md:py-[88px]">
      <div className="container-x">
        <SectionHead title={howItWorks.title} sub={howItWorks.sub} />
        <StepList steps={howItWorks.steps} />
      </div>
    </section>
  );
}
