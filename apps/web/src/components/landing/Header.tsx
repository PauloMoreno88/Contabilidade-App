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
      <div className="container-x flex h-[66px] items-center gap-4 lg:h-[78px] lg:gap-9">
        <Brand dark />
        <nav
          id="main-nav"
          className={`${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"} fixed inset-x-0 top-[66px] flex flex-col border-b border-navy-2 bg-navy px-6 pb-4 pt-2 transition lg:visible lg:static lg:ml-auto lg:translate-y-0 lg:flex-row lg:items-center lg:gap-[30px] lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-100`}
        >
          {nav.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="w-full border-b border-navy-2 py-3 font-medium text-on-navy transition-colors hover:text-white lg:w-auto lg:border-0 lg:py-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href={nav.platform.href} aria-label={nav.platform.label} className="btn btn-primary ml-auto px-3.5 py-[9px] text-[0.88rem] lg:ml-0 lg:px-5 lg:py-[11px] lg:text-[0.95rem]">
          <UserRound size={18} aria-hidden="true" />
          <span className="max-[419px]:hidden">{nav.platform.label}</span>
        </Link>
        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center lg:hidden"
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
