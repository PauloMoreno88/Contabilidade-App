import { About } from "@/components/landing/About";
import { Band } from "@/components/landing/Band";
import { Contact } from "@/components/landing/Contact";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { MobileBar } from "@/components/landing/MobileBar";
import { PlanCard } from "@/components/landing/PlanCard";
import { Services } from "@/components/landing/Services";
import { Testimonials } from "@/components/landing/Testimonials";
import { WhatsAppBlock } from "@/components/landing/WhatsAppBlock";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { Simulator } from "@/components/simulator/Simulator";

/** Landing based on variant G of the prototype (docs/prototype/exactra-prototype-g.html). */
export default function Home() {
  return (
    <div className="bg-surface pb-[74px] sm:pb-0">
      <Header />
      <main>
        <Hero />
        <Simulator />
        <About />
        <Services />
        <WhatsAppBlock />
        <PlanCard />
        <Testimonials />
        <Band />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFloat />
      <MobileBar />
    </div>
  );
}
