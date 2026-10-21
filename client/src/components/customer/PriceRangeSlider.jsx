import { useId, useRef, useState } from "react";
import {
  getSelectedPriceRange,
  movePriceHandle,
  normalizePriceBounds,
  priceAtPointer,
  pricePercent,
  priceQueryValues,
  priceSliderStep,
  snapPriceValue,
  formatPriceCompact,
} from "../../services/priceRange";
import { digitsOnlyPrice, validatePriceDraft } from "../../services/priceInput";

const fullPrice = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});

export default function PriceRangeSlider({ priceBounds, params, onPriceChange, disabled = false }) {
  const bounds = normalizePriceBounds(priceBounds);
  if (!bounds) {
    return <p className="nx30-price-empty">Price filters appear when this category has products.</p>;
  }
  // Reinitializes both text fields and slider when URL, category or Clear All changes.
  const key = `${bounds.min}:${bounds.max}:${params.get("minPrice") ?? ""}:${params.get("maxPrice") ?? ""}`;
  return <PriceRangeControl key={key} bounds={bounds} params={params} onPriceChange={onPriceChange} disabled={disabled} />;
}

function PriceRangeControl({ bounds, params, onPriceChange, disabled }) {
  const initial = getSelectedPriceRange(params, bounds);
  const [selected, setSelected] = useState(initial);
  const [draft, setDraft] = useState({ min: String(initial.min), max: String(initial.max) });
  const minId = useId();
  const maxId = useId();
  const errorId = useId();
  const sliderRef = useRef(null);
  const draggingRef = useRef(null);
  const minThumbRef = useRef(null);
  const maxThumbRef = useRef(null);
  const applied = getSelectedPriceRange(params, bounds);
  const hasFilter = params.has("minPrice") || params.has("maxPrice");
  const validation = validatePriceDraft(draft, bounds);
  const dirty = validation.valid && (selected.min !== applied.min || selected.max !== applied.max);
  const modified = draft.min !== String(applied.min) || draft.max !== String(applied.max);
  const step = priceSliderStep(bounds);
  const left = pricePercent(selected.min, bounds);
  const right = pricePercent(selected.max, bounds);

  function updateRange(next) {
    setSelected(next);
    setDraft({ min: String(next.min), max: String(next.max) });
  }

  function setTypedPrice(handle, raw) {
    const next = { ...draft, [handle]: digitsOnlyPrice(raw) };
    setDraft(next);
    const checked = validatePriceDraft(next, bounds);
    if (checked.valid) setSelected({ min: checked.min, max: checked.max });
  }

  function moveHandle(handle, value) {
    const next = movePriceHandle(handle, snapPriceValue(value, bounds, step), selected, bounds);
    updateRange(next);
  }

  function valueFromEvent(event) {
    return priceAtPointer(event.clientX, sliderRef.current?.getBoundingClientRect(), bounds);
  }

  function onPointerDown(event) {
    if (disabled || !event.isPrimary || event.button !== 0) return;
    const value = valueFromEvent(event);
    if (value === null) return;
    const targetHandle = event.target.closest("[data-range-handle]")?.dataset.rangeHandle;
    const handle = targetHandle || (Math.abs(value - selected.min) <= Math.abs(value - selected.max) ? "min" : "max");
    event.preventDefault();
    draggingRef.current = { id: event.pointerId, handle };
    event.currentTarget.setPointerCapture(event.pointerId);
    (handle === "min" ? minThumbRef : maxThumbRef).current?.focus({ preventScroll: true });
    moveHandle(handle, value);
  }

  function onPointerMove(event) {
    if (draggingRef.current?.id !== event.pointerId) return;
    const value = valueFromEvent(event);
    if (value !== null) moveHandle(draggingRef.current.handle, value);
  }

  function stopPointer(event) {
    if (draggingRef.current?.id !== event.pointerId) return;
    draggingRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onHandleKey(event, handle) {
    if (disabled) return;
    const current = selected[handle];
    let next;
    switch (event.key) {
      case "ArrowUp": case "ArrowRight": next = current + step; break;
      case "ArrowDown": case "ArrowLeft": next = current - step; break;
      case "PageUp": next = current + step * 10; break;
      case "PageDown": next = current - step * 10; break;
      case "Home": next = handle === "min" ? bounds.min : selected.min; break;
      case "End": next = handle === "max" ? bounds.max : selected.max; break;
      default: return;
    }
    event.preventDefault();
    moveHandle(handle, next);
  }

  function apply() {
    if (!validation.valid) return;
    const { min, max } = priceQueryValues(selected, bounds);
    onPriceChange(min, max);
  }

  function reset() {
    updateRange({ min: bounds.min, max: bounds.max });
    if (hasFilter) onPriceChange("", "");
  }

  return <div className="nx30-price-filter nx32-price-filter" aria-label="Filter by price">
    <div className="nx32-price-entry-row">
      {(["min", "max"]).map((handle) => <label className="nx32-price-entry" key={handle} htmlFor={handle === "min" ? minId : maxId}>
        <span>{handle === "min" ? "Min price" : "Max price"}</span>
        <span className={`nx32-price-input-wrap${validation.errors[handle] ? " is-invalid" : ""}`}>
          <span className="nx32-rupee" aria-hidden="true">₹</span>
          <input
            id={handle === "min" ? minId : maxId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            spellCheck="false"
            value={draft[handle]}
            onChange={(event) => setTypedPrice(handle, event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); apply(); } }}
            disabled={disabled}
            aria-invalid={Boolean(validation.errors[handle])}
            aria-describedby={validation.errors[handle] ? errorId : undefined}
          />
        </span>
      </label>)}
    </div>

    <div
      ref={sliderRef}
      className="nx30-price-hit-area"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopPointer}
      onPointerCancel={stopPointer}
      onLostPointerCapture={stopPointer}
    >
      <div className="nx30-price-rail">
        <div className="nx30-price-selected" style={{ left: `${left}%`, right: `${100 - right}%` }} />
        {(["min", "max"]).map((handle) => <div
          key={handle}
          ref={handle === "min" ? minThumbRef : maxThumbRef}
          className="nx30-price-handle"
          data-range-handle={handle}
          role="slider"
          aria-label={handle === "min" ? "Minimum price" : "Maximum price"}
          aria-orientation="horizontal"
          aria-valuemin={handle === "min" ? bounds.min : selected.min}
          aria-valuemax={handle === "min" ? selected.max : bounds.max}
          aria-valuenow={selected[handle]}
          aria-valuetext={fullPrice.format(selected[handle])}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(event) => onHandleKey(event, handle)}
          style={{ left: `${handle === "min" ? left : right}%`, zIndex: handle === "min" ? 2 : 3 }}
        >
          <span className="nx30-price-handle-core" />
        </div>)}
      </div>
    </div>

    <div className="nx30-price-endpoints">
      <span title={fullPrice.format(bounds.min)}>{formatPriceCompact(bounds.min)}</span>
      <span title={fullPrice.format(bounds.max)}>{formatPriceCompact(bounds.max)}</span>
    </div>

    {!validation.valid && <p className="nx32-price-error" id={errorId} role="alert">
      {validation.errors.min || validation.errors.max}
    </p>}
    <div className="nx30-price-actions">
      <button className="nx30-price-apply" type="button" onClick={apply} disabled={disabled || !dirty || !validation.valid}>Apply range</button>
      <button className="nx30-price-reset" type="button" onClick={reset} disabled={disabled || (!modified && !hasFilter)}>Reset</button>
    </div>
  </div>;
}
