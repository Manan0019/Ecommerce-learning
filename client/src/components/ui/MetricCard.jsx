import Card from './Card';

export default function MetricCard({ as = 'article', label, value, note, tone = 'neutral', children, className = '', ...props }) {
  return <Card as={as} className={`nx-ui-metric nx-ui-metric--${tone} ${className}`.trim()} {...props}>
    {label != null && <span className="nx-ui-metric-label">{label}</span>}
    {value != null && <strong className="nx-ui-metric-value">{value}</strong>}
    {note && <small className="nx-ui-metric-note">{note}</small>}{children}
  </Card>;
}
