import { band, images } from "@/config/site";

/** Call to action over a desk photo, back to the simulator. */
export function Band() {
  return (
    <section className="pt-16 md:pt-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[26px] px-6 py-10 text-white md:px-14 md:py-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images.band.src} alt={images.band.alt} className="absolute inset-0 size-full object-cover object-[center_40%]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,33,51,.95)_0%,rgba(15,33,51,.75)_50%,rgba(15,33,51,.2)_100%)]" />
          <div className="relative">
            <h2 className="max-w-[18ch] font-serif text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.12] font-semibold">{band.title}</h2>
            <p className="mt-3 max-w-[46ch] text-[#d7e0e9]">{band.text}</p>
            <a href={band.cta.href} className="btn btn-primary mt-7">{band.cta.label}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
