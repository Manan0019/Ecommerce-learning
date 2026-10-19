import { useId, useMemo, useState } from "react";
import { categoryPaths } from "../../services/categoryHierarchy";

export default function CategoryPicker({ categories = [], value = "", onChange, disabled = false, required = true, label = "Category / subcategory" }) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [text, setText] = useState(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const paths = useMemo(() => categoryPaths(categories), [categories]);
  const selected = paths.find(item => String(item.id) === String(value));
  const display = text === null ? (selected?.path || "") : text;
  const matches = paths.filter(item => !text || item.path.toLowerCase().includes(text.trim().toLowerCase())).slice(0, 30);
  function select(item) {
    onChange(String(item.id));
    setText(null);
    setOpen(false);
    setHighlight(0);
  }
  function handleKey(e) {
    if (e.key === "Escape") { setOpen(false); setText(null); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); setOpen(true);
      setHighlight(previous => Math.max(0, Math.min(matches.length - 1, previous + (e.key === "ArrowDown" ? 1 : -1))));
    }
    if (e.key === "Enter" && open && matches.length) { e.preventDefault(); select(matches[highlight] || matches[0]); }
  }
  return <div className="nx18-category-picker">
    <label htmlFor={inputId}>{label}</label>
    <div className="nx18-combobox-wrap">
      <input id={inputId} type="search" role="combobox" aria-autocomplete="list"
        aria-expanded={open} aria-controls={listId} aria-activedescendant={open && matches[highlight] ? `${listId}-${matches[highlight].id}` : undefined}
        autoComplete="off" placeholder="Search Electronics, Laptop, Beauty…" disabled={disabled} required={required} aria-required={required}
        value={display} onFocus={() => { setOpen(true); setHighlight(0); }}
        onChange={e => { setText(e.target.value); setOpen(true); setHighlight(0); }}
        onKeyDown={handleKey}
        onBlur={() => { setOpen(false); setText(null); }}/>
      <span aria-hidden="true" className="nx18-search-symbol">⌕</span>
    </div>
    {open && !disabled && <ul role="listbox" id={listId} className="nx18-category-options">
      {matches.length ? matches.map((item, index) => <li id={`${listId}-${item.id}`} key={item.id} role="option"
        aria-selected={String(value) === String(item.id)} className={index === highlight ? "is-highlighted" : ""}>
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => select(item)}>
          <span>{item.path}</span>
          <small>{paths.some(child => String(child.parentId) === String(item.id)) ? "Parent category" : "Subcategory / leaf"}</small>
        </button>
      </li>) : <li className="nx18-no-category">No matching categories</li>}
    </ul>}
    {selected && <small className="nx18-category-selected">Selected: {selected.path}</small>}
  </div>;
}
