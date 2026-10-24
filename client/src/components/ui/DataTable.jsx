/** Canonical table typography while preserving semantic native table/row/cell markup. */
export default function DataTable({className='',children,...props}){
 return <table className={`nx-ui-table ${className}`.trim()} {...props}>{children}</table>;
}
