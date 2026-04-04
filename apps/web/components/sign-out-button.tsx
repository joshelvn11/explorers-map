"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { authClient } from "../lib/auth-client";

export function SignOutButton({
  className,
  redirectTo = "/",
}: {
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const buttonClassName =
    className ??
    "inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-70";

  async function handleClick() {
    setIsPending(true);

    const result = await authClient.signOut();

    setIsPending(false);

    if (result.error) {
      return;
    }

    startTransition(() => {
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <button className={buttonClassName} disabled={isPending} onClick={() => void handleClick()} type="button">
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
