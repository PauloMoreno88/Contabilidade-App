"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { adminCopy } from "@/config/admin";
import { authClient } from "@/lib/auth";
import { Brand } from "@/components/landing/Brand";

type AdminUser = { name: string; email: string; role?: string | null; twoFactorEnabled?: boolean | null };
const SessionContext = createContext<{ user: AdminUser; reload: () => Promise<void> } | null>(null);

/** Logged-in admin and a way to refresh it (e.g. after enabling 2FA). */
export function useAdminSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAdminSession must be used inside AdminShell");
  return ctx;
}

/**
 * Client-side guard for UX only: the real protection is the API refusing
 * admin routes without an admin session.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  const reload = useCallback(async () => {
    const { data } = await authClient.getSession();
    if (data?.user.role === "admin") setUser(data.user);
    else router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/login");
  }

  if (!user) return <p className="p-8 text-muted">{adminCopy.loading}</p>;

  return (
    <SessionContext.Provider value={{ user, reload }}>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:gap-6 sm:px-6">
          <span className="hidden sm:block">
            <Brand />
          </span>
          <nav className="flex gap-1 overflow-x-auto">
            {adminCopy.nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-[0.9rem] text-muted hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink"
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
      {!user.twoFactorEnabled && pathname !== "/admin/seguranca" && (
        <div className="border-b border-line bg-amber-50">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[0.88rem] sm:px-6">
            <ShieldAlert size={16} className="shrink-0 text-amber-700" aria-hidden="true" />
            {adminCopy.twoFactorBanner.text}
            <Link href="/admin/seguranca" className="font-medium underline">{adminCopy.twoFactorBanner.cta}</Link>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">{children}</main>
    </SessionContext.Provider>
  );
}
