import { blogCategories, type BlogCategoryId } from "@/config/blog";

type Props = { category: BlogCategoryId; image?: string; alt?: string; large?: boolean };

/**
 * Article artwork: the article photo (never people, client requirement) or,
 * without one, the category icon and label over a navy panel.
 */
export function Cover({ category, image, alt = "", large = false }: Props) {
  const { icon: Icon, label } = blogCategories[category];
  const frame = `relative overflow-hidden bg-navy text-white ${large ? "aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[340px]" : "aspect-[16/9]"}`;

  if (image) {
    return (
      <div className={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      </div>
    );
  }

  return (
    <div className={frame} aria-hidden="true">
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
