"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { nav } from "@/config/site";
import { Brand } from "./Brand";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-2 bg-navy/95 text-white backdrop-blur-md">
      <div className="container-x flex h-[66px] items-center gap-4 md:h-[78px] md:gap-9">
        <Brand dark />
        <nav
          id="main-nav"
          className={`${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"} fixed inset-x-0 top-[66px] flex flex-col border-b border-navy-2 bg-navy px-6 pb-4 pt-2 transition md:visible md:static md:ml-auto md:translate-y-0 md:flex-row md:items-center md:gap-[30px] md:border-0 md:bg-transparent md:p-0 md:opacity-100`}
        >
          {nav.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="w-full border-b border-navy-2 py-3 font-medium text-on-navy transition-colors hover:text-white md:w-auto md:border-0 md:py-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href={nav.platform.href} className="btn btn-primary ml-auto px-3.5 py-[9px] text-[0.88rem] md:ml-0 md:px-5 md:py-[11px] md:text-[0.95rem]">
          <UserRound size={18} aria-hidden="true" />
          {nav.platform.label}
        </Link>
        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center md:hidden"
          aria-label={open ? nav.closeMenu : nav.openMenu}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
