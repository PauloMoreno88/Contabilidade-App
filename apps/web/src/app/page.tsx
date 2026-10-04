import { Benefits } from "@/components/landing/Benefits";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Onboarding } from "@/components/landing/Onboarding";
import { Plans } from "@/components/landing/Plans";
import { Services } from "@/components/landing/Services";
import { Simulator } from "@/components/simulator/Simulator";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { Why } from "@/components/landing/Why";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Benefits />
        <Simulator />
        <Services />
        <HowItWorks />
        <Plans />
        <Onboarding />
        <Why />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
