import Image from "next/image";

import { Badge } from "./badge";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  image?: string | null;
  badges?: Array<{ label: string; tone?: "default" | "muted" | "warm" }>;
  actions?: React.ReactNode;
};

export function PageHero({ eyebrow, title, description, image, badges = [], actions }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-950 text-stone-50 shadow-[0_30px_80px_rgba(28,25,23,0.18)]">
      <div className="absolute inset-0">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority
            className="object-cover opacity-45"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(12,10,9,0.88),rgba(28,25,23,0.55),rgba(41,37,36,0.2))]" />
      </div>
      <div className="relative flex min-h-[20rem] flex-col justify-end gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:min-h-[26rem] lg:px-10 lg:py-12">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.35em] uppercase text-stone-200/85">{eyebrow}</p>
        ) : null}
        <div className="max-w-3xl">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-stone-100/90 sm:text-lg">{description}</p>
        </div>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {badges.map((badge) => (
              <Badge key={badge.label} tone={badge.tone ?? "muted"}>
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
