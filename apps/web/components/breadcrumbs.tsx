import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-stone-400">/</span> : null}
          {item.href ? (
            <Link className="transition hover:text-stone-900" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span className="text-stone-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
