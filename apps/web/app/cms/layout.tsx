import { requireCmsActor } from "../../lib/session";

export default async function CmsLayout({
  children,
  params: _params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<unknown>;
}>) {
  await requireCmsActor("/cms");

  return children;
}
