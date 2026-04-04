import { AuthShell } from "../../components/auth-shell";
import { SignUpForm } from "../../components/sign-up-form";
import { buildMetadata } from "../../lib/metadata";
import { redirectIfAuthenticated } from "../../lib/session";

type SignUpPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export const metadata = buildMetadata({
  title: "Create account",
  description: "Create a viewer account for signed-in Explorers Map access.",
});

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { returnTo } = await searchParams;

  await redirectIfAuthenticated(returnTo);

  return (
    <AuthShell
      eyebrow="Viewer-first signup"
      title="Create a calm, signed-in starting point"
      description="Every new account starts as a viewer by default. That keeps signup open for humans while CMS access remains intentionally role-gated."
    >
      <SignUpForm returnTo={returnTo} />
    </AuthShell>
  );
}
