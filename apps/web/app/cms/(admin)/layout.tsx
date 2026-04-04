import { requireAdminActor } from "../../../lib/session";

export default async function CmsAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminActor("/cms");

  return children;
}
