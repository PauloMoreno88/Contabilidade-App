import Link from "next/link";
import { contact, footer } from "@/config/site";
import { Brand } from "./Brand";

export function Footer() {
  return (
    <footer id="contato" className="border-t border-line pb-9 pt-16 text-[0.88rem] text-muted">
      <div className="container-x">
        <div className="mb-10 grid gap-7 md:grid-cols-[1.3fr_1fr_1fr] md:gap-10">
          <div>
            <Brand />
            <p className="mt-3.5 max-w-[300px]">{footer.about}</p>
          </div>
          <div>
            <h4 className="mb-3.5 text-[0.9rem] font-semibold text-ink">{footer.contactTitle}</h4>
            <ul className="flex flex-col gap-2.5">
              <li><a href={`mailto:${contact.email}`} className="break-all hover:text-ink">{contact.email}</a></li>
              <li>{contact.phone}</li>
              <li>{contact.hours}</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3.5 text-[0.9rem] font-semibold text-ink">{footer.locationTitle}</h4>
            <ul className="flex flex-col gap-2.5">
              <li>{contact.address}</li>
              <li>{contact.coverage}</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 border-t border-line pt-6 text-[0.8rem] text-faint">
          <span>{footer.copyright}</span>
          <span className="flex gap-4">
            {footer.links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink">{l.label}</Link>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
