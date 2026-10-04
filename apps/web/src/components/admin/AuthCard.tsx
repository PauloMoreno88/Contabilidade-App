import { Brand } from "@/components/landing/Brand";

/** Centered card used by login, 2FA and password reset screens. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-[20px] border border-line bg-surface p-6 sm:p-8">
          <h1 className="mb-5 text-[1.3rem] font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Field({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[0.82rem] text-muted">{label}</label>
      <input id={id} name={id} className="field-input" {...rest} />
      {hint && <p className="mt-1 text-[0.78rem] text-faint">{hint}</p>}
    </div>
  );
}

export function FormError({ children }: { children?: React.ReactNode }) {
  return children ? <p role="alert" className="mb-4 text-[0.85rem] text-brand">{children}</p> : null;
}
