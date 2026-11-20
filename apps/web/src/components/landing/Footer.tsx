import Link from "next/link";
import { company, contact, footer, phoneLink } from "@/config/site";
import { Brand } from "./Brand";

export function Footer() {
  return (
    <footer className="bg-surface-2 pb-8 pt-14 text-[0.93rem] text-muted">
      <div className="container-x">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-3.5 max-w-[34ch]">{footer.about}</p>
          </div>
          {footer.columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-[0.95rem] font-bold text-ink">{col.title}</h4>
              <ul className="grid gap-2">
                {col.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="hover:text-ink">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="mb-3 text-[0.95rem] font-bold text-ink">{footer.contactTitle}</h4>
            <ul className="grid gap-2">
              <li><a href={phoneLink()} className="hover:text-ink">{contact.phone}</a></li>
              <li className="break-all"><a href={`mailto:${contact.email}`} className="hover:text-ink">{contact.email}</a></li>
              <li>{contact.address}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-[0.84rem]">
          <span>{footer.copyright}. {company.legalName}, CNPJ {company.cnpj}. Contador responsável: {company.crc}.</span>
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
