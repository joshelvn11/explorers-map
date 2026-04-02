type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.32em] uppercase text-stone-500">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 font-serif text-3xl text-stone-950 sm:text-4xl">{title}</h2>
        {description ? <p className="mt-3 text-base leading-7 text-stone-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
