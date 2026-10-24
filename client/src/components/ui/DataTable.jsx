import EmptyState from './EmptyState';

export default function DataTable({ className = '', children, ...props }) {
  return <table className={`nx-ui-table ${className}`.trim()} {...props}>{children}</table>;
}
export function TableContainer({ label = 'Data table', className = '', children, ...props }) {
  return <div role="region" aria-label={label} tabIndex={0} className={`nx-ui-table-container ${className}`.trim()} {...props}>{children}</div>;
}
export function TableHead(props) { return <thead {...props}/>; }
export function TableBody(props) { return <tbody {...props}/>; }
export function TableRow(props) { return <tr {...props}/>; }
export function TableHeader({ align, className = '', scope = 'col', ...props }) {
  return <th scope={scope} className={`nx-ui-table-header ${className}`.trim()} data-align={align} {...props}/>;
}
export function TableCell({ numeric = false, actions = false, className = '', ...props }) {
  return <td className={`nx-ui-table-cell ${className}`.trim()} data-numeric={numeric || undefined} data-actions={actions || undefined} {...props}/>;
}
export function TableEmptyRow({ columns, title, description, icon = 'package' }) {
  return <TableRow><TableCell colSpan={columns}><EmptyState title={title} description={description} icon={icon}/></TableCell></TableRow>;
}
export function TableLoadingRow({ columns, label = 'Loading records…' }) {
  return <TableRow><TableCell colSpan={columns}><span role="status" className="nx-ui-table-loading">{label}</span></TableCell></TableRow>;
}
