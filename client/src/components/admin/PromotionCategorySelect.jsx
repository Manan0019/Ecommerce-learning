import { useEffect, useId, useMemo, useRef, useState } from 'react';
import UiIcon from '../common/UiIcon';
import { categoryPaths } from '../../services/categoryHierarchy';

/** A tree browser with explicit navigation and selection, plus a global search. */
export default function PromotionCategorySelect({ categories = [], value = '', onChange, label, required = true }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [parentId, setParentId] = useState('');
  const root = useRef(null);
  const search = useRef(null);
  const listId = useId();
  const paths = useMemo(() => categoryPaths(categories).filter(c => c.isActive !== false), [categories]);
  const byId = useMemo(() => new Map(paths.map(c => [String(c.id), c])), [paths]);
  const children = useMemo(() => {
    const map = new Map();
    paths.forEach(item => {
      const parent = item.parentId && byId.has(String(item.parentId)) ? String(item.parentId) : '';
      map.set(parent, [...(map.get(parent) || []), item]);
    });
    for (const values of map.values()) values.sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return map;
  }, [paths, byId]);
  const selected = byId.get(String(value));
  const parent = byId.get(parentId);
  const siblings = children.get(parentId) || [];
  const matches = useMemo(() => paths.filter(c => c.path.toLocaleLowerCase().includes(term.trim().toLocaleLowerCase())).slice(0, 60), [paths, term]);
  const activeItems = term.trim() ? matches : siblings;
  const ancestors = [];
  let cursor = parent;
  while (cursor && ancestors.length < 16) {
    ancestors.unshift(cursor);
    cursor = byId.get(String(cursor.parentId));
  }
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  function toggle() {
    if (open) {setOpen(false);return;}
    setTerm('');
    setParentId(selected?.parentId && byId.has(String(selected.parentId)) ? String(selected.parentId) : '');
    setOpen(true);
    window.setTimeout(() => search.current?.focus(), 0);
  }
  function choose(item) { onChange(String(item.id)); setOpen(false); setTerm(''); setParentId(''); }
  function navigate(id) { setParentId(id); setTerm(''); search.current?.focus(); }
  function onKeyDown(e) {
    if (e.key === 'Escape') {e.stopPropagation(); setOpen(false);}
    if (e.key === 'Enter' && e.target === search.current && activeItems.length === 1) {e.preventDefault();choose(activeItems[0]);}
  }
  return <div className="nx47-category-select nx52-category-select" ref={root} onKeyDown={onKeyDown}>
    <span className="nx47-category-label">{label}{required && <b aria-label="required"> *</b>}</span>
    <button type="button" aria-expanded={open} aria-controls={listId} className={`nx47-category-trigger${open?' is-open':''}`} onClick={toggle}>
      <span>{selected ? selected.path.split(' → ').join(' / ') : 'Browse or search categories'}</span><UiIcon name="chevron-down" size={18}/>
    </button>
    {open && <div className="nx47-category-popover nx52-category-popover" id={listId}>
      <div className="nx47-category-search"><UiIcon name="search" size={18}/><input ref={search} type="search" aria-label="Search categories and subcategories" value={term}
        placeholder="Search all categories…" onChange={e=>setTerm(e.target.value)} autoComplete="off" /></div>
      {!term.trim() && <div className="nx52-category-breadcrumbs" aria-label="Category location">
        <button type="button" onClick={()=>navigate('')}>All departments</button>
        {ancestors.map(item=><span key={item.id}><UiIcon name="chevron-right" size={13}/><button type="button" onClick={()=>navigate(String(item.id))}>{item.name}</button></span>)}
      </div>}
      {!term.trim() && parent && <button type="button" className="nx52-category-choose-current" onClick={()=>choose(parent)}>
        <span><strong>Use {parent.name}</strong><small>Select this category, or browse its subcategories below</small></span><UiIcon name="check" size={18}/>
      </button>}
      <div className="nx52-category-list-heading"><span>{term.trim() ? `Search matches (${matches.length})` : parent ? 'Subcategories' : 'Main categories'}</span><small>{!term.trim() && `${siblings.length} available`}</small></div>
      <div className="nx47-category-list nx52-category-list" role="group" aria-label={label}>
        {activeItems.length ? activeItems.map(item => {
          const hasChildren = (children.get(String(item.id)) || []).length > 0;
          return <div key={item.id} className={`nx52-category-row${String(value)===String(item.id)?' is-selected':''}`}>
            <button type="button" className="nx52-category-pick" onClick={()=>choose(item)} aria-label={`Select ${item.path}`}>
              <span className="nx52-category-mark">{String(item.name).slice(0,1).toUpperCase()}</span>
              <span className="nx47-category-option-content"><strong>{item.name}</strong><small>{term.trim() ? item.path.split(' → ').slice(0,-1).join(' / ') || 'Main category' : hasChildren ? `${children.get(String(item.id)).length} subcategories` : 'Select this category'}</small></span>
              {String(value)===String(item.id)&&<UiIcon name="check" size={16}/>}</button>
            {hasChildren && <button type="button" className="nx52-category-drill" onClick={()=>navigate(String(item.id))} aria-label={`Browse subcategories of ${item.name}`}><UiIcon name="chevron-right" size={19}/></button>}
          </div>;
        }) : <p className="nx47-category-empty">{term ? 'No categories match your search.' : 'No subcategories. You can select the current category above.'}</p>}
      </div>
      <div className="nx52-category-bottom"><span>Choose a row to select it · Use the chevron to explore deeper</span><button type="button" onClick={()=>setOpen(false)}>Close</button></div>
    </div>}
  </div>;
}
