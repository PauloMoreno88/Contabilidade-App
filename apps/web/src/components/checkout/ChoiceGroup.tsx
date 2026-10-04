type Option<T extends string> = { value: T; label: string; hint?: string; aside?: string };

/** Radio group rendered as clickable cards. */
export function ChoiceGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 3,
}: {
  name: string;
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];
  return (
    <fieldset className="mb-8">
      <legend className="mb-3 text-[1.02rem] font-semibold">{legend}</legend>
      <div className={`grid gap-2.5 ${cols}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3.5 transition-colors hover:border-faint has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="flex items-baseline justify-between gap-2 text-[0.95rem] font-medium">
              {o.label}
              {o.aside && <span className="font-mono text-[0.85rem] font-normal text-muted">{o.aside}</span>}
            </span>
            {o.hint && <span className="text-[0.8rem] text-faint">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
