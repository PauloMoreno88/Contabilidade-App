import { Brand } from "@/components/landing/Brand";

/** Centered card used by sign-in, 2FA, password and activation screens. */
export function AuthCard({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-[20px] border border-line bg-surface p-6 sm:p-8">
          <h1 className={`font-serif text-[1.55rem] font-semibold leading-tight tracking-[-0.01em] ${lede ? "mb-1.5" : "mb-5"}`}>{title}</h1>
          {lede && <p className="mb-5 text-[0.9rem] text-muted">{lede}</p>}
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
