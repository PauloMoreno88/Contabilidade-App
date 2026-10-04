/** Numbered list for content that really is a sequence (hiring flow, onboarding). */
export function StepList({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="border-t border-line">
      {steps.map((s, i) => (
        <li key={s.title} className="grid grid-cols-[48px_1fr] gap-4 border-b border-line py-[22px] sm:grid-cols-[56px_1fr] sm:gap-5">
          <span className="font-mono text-[0.95rem] text-faint">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <h3 className="mb-1 text-[1.02rem] font-semibold">{s.title}</h3>
            <p className="max-w-[480px] text-[0.92rem] text-muted">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
