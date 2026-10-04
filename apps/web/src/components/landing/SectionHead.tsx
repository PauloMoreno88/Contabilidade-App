export function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-11">
      <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-semibold tracking-tight">{title}</h2>
      {sub && <p className="mt-2.5 max-w-[560px] text-muted">{sub}</p>}
    </div>
  );
}
