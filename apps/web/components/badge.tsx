type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "muted" | "warm";
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  const toneClassName =
    tone === "warm"
      ? "bg-amber-100 text-amber-900 ring-amber-200"
      : tone === "muted"
        ? "bg-white/70 text-stone-700 ring-stone-200"
        : "bg-emerald-100 text-emerald-900 ring-emerald-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase ring-1 ring-inset ${toneClassName}`}
    >
      {children}
    </span>
  );
}
