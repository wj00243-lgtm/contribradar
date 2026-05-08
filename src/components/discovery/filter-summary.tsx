type FilterSummaryProps = {
  total: number;
  languages: string[];
  topics: string[];
};

function SummaryGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.slice(0, 8).map((value) => (
            <span
              className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
              key={value}
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None</span>
        )}
      </div>
    </div>
  );
}

export function FilterSummary({ total, languages, topics }: FilterSummaryProps) {
  return (
    <section className="border-y border-zinc-900 bg-zinc-950/80 px-6 py-5">
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-[180px_1fr_1fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Matches</p>
          <p className="mt-1 text-2xl font-semibold text-white">{total}</p>
        </div>
        <SummaryGroup label="Languages" values={languages} />
        <SummaryGroup label="Topics" values={topics} />
      </div>
    </section>
  );
}
