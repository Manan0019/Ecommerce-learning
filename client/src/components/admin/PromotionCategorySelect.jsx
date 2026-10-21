import { useEffect, useId, useMemo, useRef, useState } from 'react';
import UiIcon from '../common/UiIcon';
import { categoryPaths } from '../../services/categoryHierarchy';

/** Bounded, searchable category tree selector, including deeply nested children. */
export default function PromotionCategorySelect({ categories = [], value = '', onChange, label, required = true }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const search = useRef(null);
  const listId = useId();
  const paths = useMemo(() => categoryPaths(categories).filter(c => c.isActive !== false).sort((a,b) => a.path.localeCompare(b.path, undefined, {sensitivity:'base'})), [categories]);
  const selected = paths.find(c => String(c.id) === String(value));
  const visible = useMemo(() => paths.filter(c => (c.path || '').toLocaleLowerCase().includes(term.trim().toLocaleLowerCase())).slice(0, 120), [paths, term]);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  function choose(category) { onChange(String(category.id)); setOpen(false); setTerm(''); setActive(0); }
  function keyDown(e) {
    if(e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); setOpen(true); setActive(n => Math.max(0, Math.min(visible.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))));
    }
    if(e.key === 'Enter' && open && visible.length) { e.preventDefault(); choose(visible[active] || visible[0]); }
  }
  return <div className="nx47-category-select" ref={root} onKeyDown={keyDown}>
    <span className="nx47-category-label">{label}{required && <b aria-label="required"> *</b>}</span>
    <button type="button" aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" className={`nx47-category-trigger${open?' is-open':''}`}
      onClick={() => { setOpen(o => !o); setTerm(''); setActive(0); if(!open) window.setTimeout(() => search.current?.focus(), 0); }}>
      <span>{selected ? selected.path.split(' → ').join(' / ') : 'Choose a category or subcategory'}</span><UiIcon name="chevron-down" size={18}/>
    </button>
    {open && <div className="nx47-category-popover" id={listId}>
      <div className="nx47-category-search"><UiIcon name="search" size={18}/><input ref={search} type="search" aria-label="Search categories or subcategories" value={term}
         placeholder="Search any category or subcategory…" onChange={e=>{setTerm(e.target.value);setActive(0);}} autoComplete="off" /></div>
      <div className="nx47-category-list" role="listbox" aria-label={label}>
        {visible.length ? visible.map((item,i) => {
          const depth = Math.max(0, item.path.split(' → ').length - 1);
          const parent = depth===0;
          return <button key={item.id} type="button" role="option" aria-selected={String(value) === String(item.id)}
            className={`nx47-category-option${i===active?' is-highlighted':''}`} onMouseEnter={()=>setActive(i)} onClick={()=>choose(item)}>
            <span className="nx47-category-symbol"><UiIcon name={parent?'grid':'chevron-right'} size={16}/></span>
            <span className="nx47-category-option-content"><strong>{item.name}</strong><small>{parent?'Main category':item.path.split(' → ').slice(0,-1).join(' / ')}</small></span>
            {String(item.id)===String(value)&&<span className="nx47-selected-check" aria-label="selected">✓</span>}
          </button>;
        }) : <p className="nx47-category-empty">No matching categories found.</p>}
      </div>
      <p className="nx47-category-footer">Select a main category or any nested subcategory. {paths.length > 120 && !term ? 'Search to find more.' : ''}</p>
    </div>}
  </div>;
}
