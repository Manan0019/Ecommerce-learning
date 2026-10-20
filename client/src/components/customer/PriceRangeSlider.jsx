import { useRef, useState } from "react";
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

const fullPrice = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});

export default function PriceRangeSlider({ priceBounds, params, onPriceChange, disabled = false }) {
  const bounds = normalizePriceBounds(priceBounds);
  if (!bounds) {
    return <p className="nx30-price-empty">Price filters appear when this category has products.</p>;
  }
  // URL changes, including category and Clear All, reinitialize local draft values.
  const priceKey = `${bounds.min}:${bounds.max}:${params.get("minPrice") ?? ""}:${params.get("maxPrice") ?? ""}`;
  return <PriceRangeControl key={priceKey} bounds={bounds} params={params} onPriceChange={onPriceChange} disabled={disabled} />;
}

function PriceRangeControl({ bounds, params, onPriceChange, disabled }) {
  const [selected, setSelected] = useState(() => getSelectedPriceRange(params, bounds));
  const sliderRef = useRef(null);
  const draggingRef = useRef(null);
  const minThumbRef = useRef(null);
  const maxThumbRef = useRef(null);
  const applied = getSelectedPriceRange(params, bounds);
  const hasFilter = params.has("minPrice") || params.has("maxPrice");
  const dirty = selected.min !== applied.min || selected.max !== applied.max;
  const step = priceSliderStep(bounds);
  const left = pricePercent(selected.min, bounds);
  const right = pricePercent(selected.max, bounds);

  function moveHandle(handle, value) {
    setSelected((current) => movePriceHandle(handle, snapPriceValue(value, bounds, step), current, bounds));
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
    const { min, max } = priceQueryValues(selected, bounds);
    onPriceChange(min, max);
  }

  function reset() {
    setSelected({ min: bounds.min, max: bounds.max });
    if (hasFilter) onPriceChange("", "");
  }

  return <div className="nx30-price-filter" aria-label="Filter by price">
    <div className="nx30-price-values">
      <div className="nx30-price-value" title={fullPrice.format(selected.min)}>
        <span>MIN PRICE</span>
        <output aria-label={`Minimum ${fullPrice.format(selected.min)}`}>{formatPriceCompact(selected.min)}</output>
      </div>
      <span className="nx30-price-value-separator" aria-hidden="true">–</span>
      <div className="nx30-price-value" title={fullPrice.format(selected.max)}>
        <span>MAX PRICE</span>
        <output aria-label={`Maximum ${fullPrice.format(selected.max)}`}>{formatPriceCompact(selected.max)}</output>
      </div>
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

    <div className="nx30-price-actions">
      <button className="nx30-price-apply" type="button" onClick={apply} disabled={disabled || !dirty}>
        Apply price
      </button>
      <button className="nx30-price-reset" type="button" onClick={reset} disabled={disabled || (!dirty && !hasFilter)}>
        Reset
      </button>
    </div>
    <p className="nx30-price-hint">Drag handles to set your budget</p>
  </div>;
}
