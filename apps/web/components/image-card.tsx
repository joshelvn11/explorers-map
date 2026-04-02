import Image from "next/image";
import Link from "next/link";

type ImageCardProps = {
  href: string;
  image: string;
  eyebrow?: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
};

export function ImageCard({ href, image, eyebrow, title, description, footer }: ImageCardProps) {
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white/85 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(28,25,23,0.12)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950/55 to-transparent" />
      </div>
      <div className="space-y-3 px-5 py-5">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.28em] uppercase text-stone-500">{eyebrow}</p>
        ) : null}
        <div>
          <h3 className="font-serif text-2xl text-stone-950">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">{description}</p>
        </div>
        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    </Link>
  );
}
