type CardProps = {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
};

export default function Card({ title, value, subtitle, className = "" }: CardProps) {
  return (
    <article
      className={`rounded-2xl border border-white/10 bg-slate-900/75 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-slate-900 ${className}`}
    >
      <div className="h-1 w-14 rounded-full bg-gradient-to-r from-cyan-300 to-purple-400" />
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
      {subtitle ? <p className="mt-2 text-xs text-slate-400">{subtitle}</p> : null}
    </article>
  );
}
