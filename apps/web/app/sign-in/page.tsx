import { AuthShell } from "../../components/auth-shell";
import { SignInForm } from "../../components/sign-in-form";
import { buildMetadata } from "../../lib/metadata";
import { redirectIfAuthenticated } from "../../lib/session";

type SignInPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export const metadata = buildMetadata({
  title: "Sign in",
  description: "Access your Explorers Map account and protected editorial surfaces.",
});

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { returnTo } = await searchParams;

  await redirectIfAuthenticated(returnTo);

  return (
    <AuthShell
      eyebrow="Browser auth"
      title="Step back into your editorial workspace"
      description="Signed-in accounts unlock the account surface now and protect the upcoming CMS without changing public anonymous browsing."
    >
      <SignInForm returnTo={returnTo} />
    </AuthShell>
  );
}
