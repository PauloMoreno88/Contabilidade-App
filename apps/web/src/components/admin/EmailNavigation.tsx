"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Send } from "lucide-react";

export function EmailNavigation() {
  const history = usePathname() !== "/admin/emails";
  return (
    <nav aria-label="E-mails" className="mb-8 flex gap-6 border-b border-line">
      {[
        { href: "/admin/emails", label: "Novo envio", icon: Send, active: !history },
        { href: "/admin/emails/historico", label: "Histórico de envios", icon: History, active: history },
      ].map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} aria-current={active ? "page" : undefined} className="-mb-px inline-flex items-center gap-2 border-b-2 border-transparent pb-4 text-sm font-medium text-muted transition-colors hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-ink">
          <Icon size={16} aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  );
}
