import UiIcon from '../common/UiIcon';
/** Central arrow pager, 10 results per page by default; works with REST and local lists. */
export const DEFAULT_PAGE_SIZE=10;
export default function Pagination({page=1,pages=1,total=0,pageSize=DEFAULT_PAGE_SIZE,label='items',onPageChange,className='',always=false}){
 const last=Math.max(1,Number(pages)||1), current=Math.max(1,Math.min(last,Number(page)||1));
 if(!always&&last<=1)return null;
 const count=Math.max(0,Number(total)||0),size=Math.max(1,Number(pageSize)||DEFAULT_PAGE_SIZE);
 const from=count?(current-1)*size+1:0,to=Math.min(count,current*size);
 return <nav className={`nx-ui-pagination ${className}`.trim()} aria-label={`${label} pagination`}>
  <button type="button" aria-label="Previous page" title="Previous page" disabled={current<=1} onClick={()=>onPageChange?.(current-1)}><UiIcon name="chevron-left" size={20}/></button>
  <span className="nx-ui-pagination-status" role="status">Page <b>{current}</b> of <b>{last}</b><small>{from}–{to} of {count} {label}</small></span>
  <button type="button" aria-label="Next page" title="Next page" disabled={current>=last} onClick={()=>onPageChange?.(current+1)}><UiIcon name="chevron-right" size={20}/></button>
 </nav>;
}
