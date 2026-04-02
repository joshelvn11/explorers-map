type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/75 px-6 py-10 text-center shadow-sm backdrop-blur">
      <p className="text-xs font-semibold tracking-[0.3em] uppercase text-stone-500">Nothing here yet</p>
      <h2 className="mt-3 font-serif text-2xl text-stone-950">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
