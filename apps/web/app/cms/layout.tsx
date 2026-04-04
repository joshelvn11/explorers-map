import { CmsShell } from "../../components/cms-shell";
import { requireCmsActor } from "../../lib/session";

export default async function CmsLayout({
  children,
  params: _params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<unknown>;
}>) {
  const actor = await requireCmsActor("/cms");

  return <CmsShell actor={actor}>{children}</CmsShell>;
}
