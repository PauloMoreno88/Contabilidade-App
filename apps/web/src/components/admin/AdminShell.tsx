"use client";

import { Loading } from "@/components/common/Loading";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CalendarDays, CheckSquare, FileText, Mail, ShieldAlert, ShieldCheck, UserRoundSearch, Users } from "lucide-react";
import { adminCopy } from "@/config/admin";
import { authClient } from "@/lib/auth";
import { WorkspaceShell } from "@/components/common/WorkspaceShell";

const navIcons = { "/admin/emails": Mail, "/admin/mes": CalendarDays, "/admin/clientes": Users, "/admin": FileText, "/admin/leads": UserRoundSearch, "/admin/checklist": CheckSquare, "/admin/seguranca": ShieldCheck };

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
    if (!data?.user) return router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
    if (data.user.role !== "admin") return router.replace("/app");
    setUser(data.user);
  }, [router, pathname]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/entrar");
  }

  if (!user) return <Loading />;

  return (
    <SessionContext.Provider value={{ user, reload }}>
      <WorkspaceShell title="Painel administrativo" homeHref="/admin/mes" accountName={user.name} accountEmail={user.email} onSignOut={signOut}
        navigation={adminCopy.nav.map((n) => ({ ...n, icon: navIcons[n.href as keyof typeof navIcons], active: n.href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/contrato") : pathname === n.href || pathname.startsWith(`${n.href}/`) }))}
        banners={!user.twoFactorEnabled && pathname !== "/admin/seguranca" && (
        <div className="border-b border-line bg-amber-50">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[0.88rem] sm:px-6 lg:px-8">
            <ShieldAlert size={16} className="shrink-0 text-amber-700" aria-hidden="true" />
            {adminCopy.twoFactorBanner.text}
            <Link href="/admin/seguranca" className="font-medium underline">{adminCopy.twoFactorBanner.cta}</Link>
          </div>
        </div>
      )}>
        {children}
      </WorkspaceShell>
    </SessionContext.Provider>
  );
}
