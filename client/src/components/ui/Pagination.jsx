import IconButton from './IconButton';
import { paginationModel } from './paginationModel';

/** Server pages are passed through; this component never fetches or slices records. */
export default function Pagination({ page = 1, pages, total = 0, pageSize, label = 'records', onPageChange, className = '', always = true }) {
  const state = paginationModel({ page, pages, total, pageSize });
  if (!always && state.pages <= 1) return null;
  return <nav className={`nx-ui-pagination ${className}`.trim()} aria-label={`${label} pagination`} data-unsaved-ignore="true">
    <IconButton icon="chevron-left" label="Previous page" disabled={state.page <= 1} onClick={() => onPageChange?.(state.page - 1)}/>
    <span className="nx-ui-pagination-status" role="status" aria-live="polite">Page {state.page} of {state.pages}<span> · Showing {state.from}–{state.to} of {state.total} {label}</span></span>
    <IconButton icon="chevron-right" label="Next page" disabled={state.page >= state.pages} onClick={() => onPageChange?.(state.page + 1)}/>
  </nav>;
}
