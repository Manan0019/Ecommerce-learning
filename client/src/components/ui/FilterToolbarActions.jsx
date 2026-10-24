/** Shared trailing toolbar area for active-filter resets, record counts and view controls. */
export default function FilterToolbarActions({children,className='',...props}) {
  return <div className={`nx-ui-filter-actions ${className}`.trim()} {...props}>{children}</div>;
}
