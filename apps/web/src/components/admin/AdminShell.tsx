"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { adminCopy } from "@/config/admin";
import { authClient } from "@/lib/auth";
import { Brand } from "@/components/landing/Brand";

/**
 * Client-side guard for UX only: the real protection is the API refusing
 * admin routes without an admin session.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user.role === "admin") setUser(data.user);
      else router.replace("/admin/login");
    });
  }, [router]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/login");
  }

  if (!user) return <p className="p-8 text-muted">{adminCopy.loading}</p>;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
          <Brand />
          <nav className="flex gap-1">
            {adminCopy.nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
                className="rounded-md px-3 py-1.5 text-[0.9rem] text-muted hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={signOut} className="ml-auto flex items-center gap-1.5 text-[0.86rem] text-muted hover:text-ink">
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{adminCopy.signOut}</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
