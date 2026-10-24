import { useCallback, useState } from 'react';
import { paginationModel } from '../components/ui/paginationModel';

/** Local collections only. A stable reset key represents filters, never live revisions. */
export default function usePagination(items, resetKey = '') {
  const [selection, setSelection] = useState({ page: 1, resetKey });
  const setPage = useCallback(page => setSelection(previous => previous.page === page && previous.resetKey === resetKey ? previous : { page, resetKey }), [resetKey]);
  const state = paginationModel({ total: items.length, page: selection.resetKey === resetKey ? selection.page : 1 });
  // Clamp stored state too: a deleted last page must not reappear on the next socket update.
  if (selection.resetKey !== resetKey || selection.page !== state.page) {
    setSelection({ page: state.page, resetKey });
  }
  return {
    ...state,
    items: items.slice((state.page - 1) * state.pageSize, state.page * state.pageSize),
    setPage,
  };
}
