"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { nav } from "@/config/site";
import { Brand } from "./Brand";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-bg/90 backdrop-blur-md">
      <div className="container-x flex h-[76px] items-center justify-between gap-5">
        <Brand />
        <nav
          id="main-nav"
          className={`${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"} fixed inset-x-0 top-[76px] flex flex-col border-b border-line bg-surface px-6 pb-4 pt-2 transition md:visible md:static md:translate-y-0 md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:opacity-100`}
        >
          {nav.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="w-full border-b border-line/80 py-3 text-[0.92rem] text-muted transition-colors hover:text-ink md:w-auto md:border-0 md:py-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3.5">
          <Link href={nav.cta.href} className="btn btn-primary hidden md:inline-flex">
            {nav.cta.label}
          </Link>
          <button
            type="button"
            className="grid size-11 place-items-center md:hidden"
            aria-label={open ? nav.closeMenu : nav.openMenu}
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
