type StatCardProps = {
  label: string;
  value: string;
  note: string;
  tone?: string;
};

export function StatCard({ label, value, note, tone }: StatCardProps) {
  return (
    <article className={`stat-card ${tone ?? ""}`}>
      <p className="metric-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="muted-text">{note}</p>
    </article>
  );
}
