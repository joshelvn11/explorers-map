import type { Metadata } from "next";

import { siteName } from "./routes";

type BuildMetadataInput = {
  title: string;
  description: string;
  image?: string;
};

export function buildMetadata({ title, description, image }: BuildMetadataInput): Metadata {
  const fullTitle = title === siteName ? siteName : `${title} | ${siteName}`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function getMetadataBase() {
  const configuredOrigin = process.env.EXPLORERS_MAP_PUBLIC_APP_URL;

  if (configuredOrigin && configuredOrigin.trim().length > 0) {
    return new URL(configuredOrigin);
  }

  return new URL("http://localhost:3000");
}
