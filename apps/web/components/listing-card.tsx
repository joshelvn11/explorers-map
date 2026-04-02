import Link from "next/link";

import type { ListingSummary } from "@explorers-map/services";

import { getBusynessLabel } from "../lib/routes";
import { Badge } from "./badge";
import { ImageCard } from "./image-card";

type ListingCardProps = {
  listing: ListingSummary;
  href: string;
  eyebrow?: string;
};

export function ListingCard({ listing, href, eyebrow }: ListingCardProps) {
  return (
    <ImageCard
      href={href}
      image={listing.coverImage}
      eyebrow={eyebrow ?? `${listing.region.title} • ${listing.category.title}`}
      title={listing.title}
      description={listing.shortDescription}
      footer={
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{listing.category.title}</Badge>
            <Badge tone="warm">{getBusynessLabel(listing.busynessRating)}</Badge>
          </div>
          {listing.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {listing.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
          <span className="inline-flex text-sm font-medium text-emerald-800 transition group-hover:text-emerald-900">
            View place
          </span>
        </div>
      }
    />
  );
}

type ListingGridProps = {
  items: Array<{ listing: ListingSummary; href: string; eyebrow?: string }>;
};

export function ListingGrid({ items }: ListingGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ListingCard key={`${item.listing.region.slug}-${item.listing.slug}`} listing={item.listing} href={item.href} eyebrow={item.eyebrow} />
      ))}
    </div>
  );
}

export function InlineListingLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="text-emerald-800 underline decoration-emerald-300 underline-offset-4 transition hover:text-emerald-950" href={href}>
      {children}
    </Link>
  );
}
