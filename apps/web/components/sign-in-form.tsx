"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { authClient } from "../lib/auth-client";
import { sanitizeReturnTo } from "../lib/auth-redirect";
import { getAccountHref, getSignUpHref } from "../lib/routes";

export function SignInForm({ returnTo }: { returnTo?: string | null }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const safeReturnTo = sanitizeReturnTo(returnTo) ?? getAccountHref();

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setErrorMessage(null);

    const result = await authClient.signIn.email({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      rememberMe: true,
    });

    setIsPending(false);

    if (result.error) {
      setErrorMessage(result.error.message || "Sign in failed. Please check your email and password.");
      return;
    }

    startTransition(() => {
      router.replace(safeReturnTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-3xl text-stone-950">Sign in</h2>
        <p className="text-sm leading-6 text-stone-600">
          Viewer accounts can access personal account pages now, while CMS access stays limited to admins, country moderators, and moderators.
        </p>
      </div>

      <form
        action={(formData) => {
          void handleSubmit(formData);
        }}
        className="space-y-4"
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Email</span>
          <input
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            name="email"
            type="email"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Password</span>
          <input
            required
            autoComplete="current-password"
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            name="password"
            type="password"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-stone-600">
        Need an account?{" "}
        <Link className="font-semibold text-emerald-800 transition hover:text-emerald-950" href={getSignUpHref(returnTo ?? undefined)}>
          Create one
        </Link>
      </p>
    </div>
  );
}
