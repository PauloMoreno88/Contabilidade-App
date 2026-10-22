import { blogCategories, type BlogCategoryId } from "@/config/blog";

/**
 * Article artwork without photos (client requirement: no people): the category
 * icon over a navy panel with the same ring motif used on the landing.
 */
export function Cover({ category, large = false }: { category: BlogCategoryId; large?: boolean }) {
  const { icon: Icon, label } = blogCategories[category];
  return (
    <div
      className={`relative overflow-hidden bg-navy text-white ${large ? "aspect-[16/10] lg:aspect-auto lg:h-full" : "aspect-[16/9]"}`}
      aria-hidden="true"
    >
      <span className="absolute -bottom-[38%] -right-[14%] aspect-square w-[62%] rounded-full border-[28px] border-white/[.06]" />
      <span className="absolute -left-[10%] -top-[30%] aspect-square w-[40%] rounded-full bg-brand/25 blur-2xl" />
      <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-white">
          <Icon size={22} />
        </span>
        <span className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-on-navy">{label}</span>
      </div>
    </div>
  );
}
