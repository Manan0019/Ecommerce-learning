import { useRef, useState } from "react";
import {
  getSelectedPriceRange,
  movePriceHandle,
  normalizePriceBounds,
  priceQueryValues,
} from "../../services/priceRange";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});

export default function PriceRangeSlider({ priceBounds, params, onPriceChange, disabled }) {
  const bounds = normalizePriceBounds(priceBounds);
  if (!bounds) return <p className="nx28-price-help">Price range will appear when products are available.</p>;
  return (
    <PriceRangeControl
      key={`${bounds.min}:${bounds.max}:${params.get("minPrice") || ""}:${params.get("maxPrice") || ""}`}
      bounds={bounds}
      params={params}
      onPriceChange={onPriceChange}
      disabled={disabled}
    />
  );
}

function PriceRangeControl({ bounds, params, onPriceChange, disabled }) {
  const [selected, setSelected] = useState(() => getSelectedPriceRange(params, bounds));
  const railRef = useRef(null);
  const dragRef = useRef(null);
  const span = bounds.max - bounds.min;
  const minPct = ((selected.min - bounds.min) / span) * 100;
  const maxPct = ((selected.max - bounds.min) / span) * 100;
  const applied = getSelectedPriceRange(params, bounds);
  const dirty = selected.min !== applied.min || selected.max !== applied.max;
  const filtered = params.has("minPrice") || params.has("maxPrice");
  const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(span)) - 2));

  function update(handle, next) {
    setSelected((current) => movePriceHandle(handle, next, current, bounds));
  }
  function valueFromPointer(clientX) {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect?.width) return null;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(bounds.min + span * ratio);
  }
  function startDrag(event, handle) {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    dragRef.current = { id: event.pointerId, handle };
    event.currentTarget.setPointerCapture(event.pointerId);
    const value = valueFromPointer(event.clientX);
    if (value !== null) update(handle, value);
  }
  function moveDrag(event) {
    if (dragRef.current?.id !== event.pointerId) return;
    const value = valueFromPointer(event.clientX);
    if (value !== null) update(dragRef.current.handle, value);
  }
  function stopDrag(event) {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  }
  function chooseOnTrack(event) {
    if (disabled || event.target.closest(".nx29-price-thumb")) return;
    const value = valueFromPointer(event.clientX);
    if (value === null) return;
    update(Math.abs(value - selected.min) <= Math.abs(value - selected.max) ? "min" : "max", value);
  }
  function onKey(event, handle) {
    if (disabled) return;
    let next;
    const current = selected[handle];
    if (["ArrowRight", "ArrowUp"].includes(event.key)) next = current + step;
    else if (["ArrowLeft", "ArrowDown"].includes(event.key)) next = current - step;
    else if (event.key === "PageUp") next = current + step * 10;
    else if (event.key === "PageDown") next = current - step * 10;
    else if (event.key === "Home") next = handle === "min" ? bounds.min : selected.min;
    else if (event.key === "End") next = handle === "max" ? bounds.max : selected.max;
    else return;
    event.preventDefault();
    update(handle, next);
  }
  function apply() {
    const { min, max } = priceQueryValues(selected, bounds);
    onPriceChange(min, max);
  }
  function reset() {
    setSelected({ min: bounds.min, max: bounds.max });
    if (filtered) onPriceChange("", "");
  }

  return <div className="nx28-price-range nx29-price-range">
    <div className="nx28-price-values" aria-live="off">
      <output aria-label="Selected minimum price">{rupees.format(selected.min)}</output>
      <span aria-hidden="true">—</span>
      <output aria-label="Selected maximum price">{rupees.format(selected.max)}</output>
    </div>
    <div className="nx29-price-slider" aria-label="Price budget">
      <div className="nx29-price-rail" ref={railRef} onPointerDown={chooseOnTrack}>
        <div className="nx29-price-fill" style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }} />
        {(["min", "max"]).map((handle) => <div
          key={handle}
          className={`nx29-price-thumb nx29-thumb-${handle}`}
          style={{ left: `${handle === "min" ? minPct : maxPct}%`, zIndex: handle === "min" && selected.min === selected.max ? 5 : handle === "max" ? 4 : 3 }}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={handle === "min" ? "Minimum price" : "Maximum price"}
          aria-valuemin={handle === "min" ? bounds.min : selected.min}
          aria-valuemax={handle === "min" ? selected.max : bounds.max}
          aria-valuenow={selected[handle]}
          aria-valuetext={rupees.format(selected[handle])}
          aria-disabled={disabled || undefined}
          onPointerDown={(event) => startDrag(event, handle)}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          onKeyDown={(event) => onKey(event, handle)}
        />)}
      </div>
    </div>
    <div className="nx28-range-endpoints">
      <span>{rupees.format(bounds.min)}</span>
      <span>{rupees.format(bounds.max)}</span>
    </div>
    <div className="nx28-price-actions">
      <button type="button" className="nx28-price-apply" onClick={apply} disabled={disabled || !dirty}>Apply range</button>
      <button type="button" className="nx28-price-reset" onClick={reset} disabled={disabled || (!dirty && !filtered)}>Reset</button>
    </div>
    <p className="nx28-price-help">Drag the purple handles or tap the track. Arrow keys adjust the selected handle.</p>
  </div>;
}
