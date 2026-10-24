export default function IconActionGroup({ as: Component = 'div', label = 'Actions', className = '', children, ...props }) {
  return <Component role="group" aria-label={label} className={`nx-ui-actions ${className}`.trim()} {...props}>{children}</Component>;
}
