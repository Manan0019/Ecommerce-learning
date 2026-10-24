export default function StatusBadge({ tone = 'neutral', className = '', children, ...props }) {
  return <span className={`nx-ui-badge nx-ui-badge--${tone} ${className}`.trim()} {...props}>{children}</span>;
}
export function CountBadge({ className = '', children, ...props }) {
  return <span className={`nx-ui-count ${className}`.trim()} {...props}>{children}</span>;
}
