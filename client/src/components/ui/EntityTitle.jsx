export default function EntityTitle({ as: Component = 'strong', size = 'md', className = '', children, ...props }) {
  return <Component className={`nx-ui-entity-title nx-ui-entity-title--${size} ${className}`.trim()} {...props}>{children}</Component>;
}
export function EntitySubtitle({ as: Component = 'small', className = '', children, ...props }) {
  return <Component className={`nx-ui-entity-subtitle ${className}`.trim()} {...props}>{children}</Component>;
}
