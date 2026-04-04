export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(17,94,89,0.96),rgba(9,53,44,0.94))] p-8 text-emerald-50 shadow-[0_30px_90px_rgba(15,23,42,0.16)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200/90">{eyebrow}</p>
          <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-100/88 sm:text-lg">{description}</p>
        </section>
        <section className="rounded-[2rem] border border-stone-200/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
