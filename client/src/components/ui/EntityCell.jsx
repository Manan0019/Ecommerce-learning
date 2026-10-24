export default function EntityCell({ className = '', children, ...props }) {
  return <div className={`nx-ui-entity-cell ${className}`.trim()} {...props}>{children}</div>;
}
