import { useState } from "react";
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
  if (!bounds) {
    return <p className="nx28-price-help">Price range will appear when products are available.</p>;
  }
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
  const span = bounds.max - bounds.min;
  const minPct = (selected.min - bounds.min) / span * 100;
  const maxPct = (selected.max - bounds.min) / span * 100;
  const applied = getSelectedPriceRange(params, bounds);
  const dirty = selected.min !== applied.min || selected.max !== applied.max;
  const filtered = params.has("minPrice") || params.has("maxPrice");

  function update(handle, next) {
    setSelected((current) => movePriceHandle(handle, next, current, bounds));
  }

  function apply() {
    const { min, max } = priceQueryValues(selected, bounds);
    onPriceChange(min, max);
  }

  function reset() {
    setSelected({ min: bounds.min, max: bounds.max });
    if (filtered) onPriceChange("", "");
  }

  return (
    <div className="nx28-price-range">
      <div className="nx28-price-values" aria-live="off">
        <output>{rupees.format(selected.min)}</output>
        <span aria-hidden="true">—</span>
        <output>{rupees.format(selected.max)}</output>
      </div>
      <div className="nx28-range-track">
        <div className="nx28-range-rail" />
        <div className="nx28-range-fill" style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }} />
        <input
          type="range"
          aria-label="Minimum price"
          min={bounds.min}
          max={bounds.max}
          step="1"
          value={selected.min}
          disabled={disabled}
          onChange={(event) => update("min", event.target.value)}
          style={{ zIndex: selected.min >= bounds.max - 2 ? 5 : 3 }}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={bounds.min}
          max={bounds.max}
          step="1"
          value={selected.max}
          disabled={disabled}
          onChange={(event) => update("max", event.target.value)}
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="nx28-range-endpoints">
        <span>{rupees.format(bounds.min)}</span>
        <span>{rupees.format(bounds.max)}</span>
      </div>
      <div className="nx28-price-actions">
        <button type="button" className="nx28-price-apply" onClick={apply} disabled={disabled || !dirty}>
          Apply range
        </button>
        <button type="button" className="nx28-price-reset" onClick={reset} disabled={disabled || (!dirty && !filtered)}>
          Reset
        </button>
      </div>
      <p className="nx28-price-help">Drag either handle to choose your budget.</p>
    </div>
  );
}
