export function MetricCard({ label, value, detail, tone = 'neutral' }) {
  return <article className={`metric-card ${tone}`}>
    <p>{label}</p>
    <strong>{value}</strong>
    {detail && <span>{detail}</span>}
  </article>;
}
