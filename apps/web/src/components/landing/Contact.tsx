import { MessageCircle } from "lucide-react";
import { contact, contactSection as copy, images, whatsappLink } from "@/config/site";

/** Dark contact band over an office photo. No form: WhatsApp, phone and e-mail. */
export function Contact() {
  return (
    <section id="contato" className="relative bg-navy py-16 text-white md:py-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images.contact.src} alt={images.contact.alt} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-navy/[.93]" />
      <div className="container-x relative grid items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] md:gap-16">
        <div>
          <h2 className="font-serif text-[clamp(2rem,3.6vw,2.8rem)] leading-[1.1] font-semibold">{copy.title}</h2>
          <p className="mt-3 max-w-[48ch] text-on-navy">{copy.text}</p>
          <p className="mt-2.5 font-serif text-[clamp(2rem,3.4vw,2.6rem)] font-semibold tabular-nums">{contact.phone}</p>
          <a href={whatsappLink()} target="_blank" rel="noopener" className="btn mt-[22px] bg-wa text-[#05210f] hover:bg-wa-dark">
            <MessageCircle size={20} aria-hidden="true" />
            {copy.whatsapp}
          </a>
        </div>
        <div className="grid gap-5 border-t border-white/15 pt-8 md:border-l md:border-t-0 md:pl-12 md:pt-0">
          <dl className="grid gap-5">
            <div>
              <dt className="text-[0.88rem] font-semibold text-on-navy-faint">{copy.emailLabel}</dt>
              <dd className="mt-1 break-all text-[1.1rem]">{contact.email}</dd>
            </div>
            <div>
              <dt className="text-[0.88rem] font-semibold text-on-navy-faint">{copy.hoursLabel}</dt>
              <dd className="mt-1 text-[1.1rem]">{contact.hours}</dd>
            </div>
          </dl>
          <p className="text-[1.1rem]">{contact.coverage}</p>
        </div>
      </div>
    </section>
  );
}
