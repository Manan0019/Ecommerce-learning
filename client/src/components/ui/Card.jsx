export default function Card({ as: Component = 'section', tone = 'neutral', className = '', children, ...props }) {
  return <Component className={`nx-ui-card nx-ui-card--${tone} ${className}`.trim()} {...props}>{children}</Component>;
}
