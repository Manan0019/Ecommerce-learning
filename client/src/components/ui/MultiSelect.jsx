import { useEffect, useId, useMemo, useRef, useState } from 'react';
import UiIcon from '../common/UiIcon';
import Button from './Button';
import Checkbox from './Checkbox';
import SearchField from './SearchField';

/**
 * Shared multi-value specification control. No Ctrl/Command selection needed.
 * Value/onChange use the same string[] contract as native <select multiple>.
 * The options list stays in document flow so a scrollable modal won't clip it.
 */
export default function MultiSelect({
  id, label, options = [], value = [], onChange, disabled = false,
  placeholder = 'Choose options', searchable = true, className = '',
}) {
  const autoId = useId();
  const controlId = id || autoId;
  const panelId = `${controlId}-options`;
  const triggerRef = useRef(null);
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const available = useMemo(() => [...new Set(options.map(String))], [options]);
  const selected = useMemo(() => Array.isArray(value)
    ? [...new Set(value.map(String))].filter(option => available.includes(option))
    : [], [value, available]);
  const filtered = available.filter(option => option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const visibleSelected = filtered.filter(option => selected.includes(option));
  const allVisibleSelected = filtered.length > 0 && visibleSelected.length === filtered.length;

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function update(next) {
    if (!disabled) onChange?.(next);
  }
  function toggle(option) {
    update(selected.includes(option)
      ? selected.filter(entry => entry !== option)
      : available.filter(entry => selected.includes(entry) || entry === option));
  }
  function selectVisible() {
    update(available.filter(entry => selected.includes(entry) || filtered.includes(entry)));
  }
  function clearVisible() {
    update(selected.filter(entry => !filtered.includes(entry)));
  }
  function close(focus = false) {
    setOpen(false);
    setQuery('');
    if (focus) triggerRef.current?.focus();
  }

  return <div className={`nx-ui-field nx-ui-multiselect ${className}`.trim()} ref={rootRef}>
    <label className="nx-ui-field-label" htmlFor={`${controlId}-trigger`}>{label}</label>
    <Button ref={triggerRef} type="button" id={`${controlId}-trigger`} className="nx-ui-multi-trigger"
      variant="secondary" disabled={disabled} aria-expanded={open} aria-controls={panelId}
      onClick={() => { setOpen(prev => !prev); setQuery(''); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' && !open) { event.preventDefault(); setOpen(true); }
        if (event.key === 'Escape' && open) { event.preventDefault(); close(true); }
      }}>
      <span className={selected.length ? 'nx-ui-multi-value' : 'nx-ui-multi-placeholder'}>
        {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} options selected`}
      </span>
      <span className="nx-ui-multi-trigger-trailing">
        {selected.length > 0 && <span className="nx-ui-multi-count">{selected.length}</span>}
        <UiIcon name="chevron-down" size={16} className={open ? 'nx-ui-multi-chevron is-open' : 'nx-ui-multi-chevron'} />
      </span>
    </Button>
    {selected.length > 0 && <div className="nx-ui-multi-chips" aria-label={`${label}: selected options`}>
      {selected.map(option => <Button key={option} type="button" variant="ghost" className="nx-ui-multi-chip"
        disabled={disabled} aria-label={`Remove ${option}`} title={`Remove ${option}`}
        onClick={() => toggle(option)}>
        <span>{option}</span><UiIcon name="x" size={13}/>
      </Button>)}
    </div>}
    {open && !disabled && <div id={panelId} className="nx-ui-multi-panel" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    }}>
      {searchable && available.length > 5 && <SearchField size="sm" value={query} label={`Search ${label}`}
        placeholder="Search options" className="nx-ui-multi-search"
        onChange={event => setQuery(event.target.value)}/>}
      <div className="nx-ui-multi-tools">
        <span>{selected.length} of {available.length} selected</span>
        <div>
          <Button variant="ghost" size="sm" type="button" onClick={selectVisible}
            disabled={filtered.length === 0 || allVisibleSelected}>
            {query ? 'Select matches' : 'Select all'}
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={clearVisible}
            disabled={visibleSelected.length === 0}>Clear</Button>
        </div>
      </div>
      <div className="nx-ui-multi-options" role="group" aria-label={`${label} options`}>
        {filtered.map((option) => <label className="nx-ui-multi-option" key={option}>
          <Checkbox type="checkbox"
            checked={selected.includes(option)} onChange={() => toggle(option)}/>
          <span>{option}</span>
          {selected.includes(option) && <UiIcon name="check" size={15} className="nx-ui-multi-option-check" />}
        </label>)}
        {filtered.length === 0 && <p className="nx-ui-multi-empty">No matching options.</p>}
      </div>
      <div className="nx-ui-multi-footer">
        <Button type="button" variant="secondary" size="sm" onClick={() => close(true)}>Done</Button>
      </div>
    </div>}
  </div>;
}
