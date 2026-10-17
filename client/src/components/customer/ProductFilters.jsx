import { useState } from "react";

function selectedValues(params, key) {
  return (params.get(key) || "").split(",").filter(Boolean);
}

export default function ProductFilters({
  facets,
  params,
  onFilterChange,
  onPriceChange,
  disabled,
}) {
  const priceKey = `${params.get("minPrice") || ""}:${params.get("maxPrice") || ""}`;
  return (
    <ProductFiltersContent
      key={priceKey}
      facets={facets}
      params={params}
      onFilterChange={onFilterChange}
      onPriceChange={onPriceChange}
      disabled={disabled}
    />
  );
}

function ProductFiltersContent({
  facets,
  params,
  onFilterChange,
  onPriceChange,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(params.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");

  function toggleValue(key, value, checked) {
    const selected = new Set(selectedValues(params, key));
    if (checked) selected.add(value);
    else selected.delete(value);
    onFilterChange(key, [...selected]);
  }

  const inStock = params.get("inStock") === "true";

  return (
    <aside className={`catalogue-filters ${open ? "is-open" : ""}`}>
      <button
        className="filter-mobile-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Hide filters" : "Show filters"}
      </button>
      <div className="filter-panel">
        <div className="filter-panel-heading">
          <h2>Filters</h2>
          <button type="button" onClick={() => onFilterChange(null, [])}>
            Clear all
          </button>
        </div>
        <fieldset className="filter-group">
          <legend>Availability</legend>
          <label className="filter-option">
            <input
              type="checkbox"
              disabled={disabled}
              checked={inStock}
              onChange={(event) =>
                onFilterChange("inStock", event.target.checked ? ["true"] : [])
              }
            />
            <span>In stock only</span>
          </label>
        </fieldset>
        <fieldset className="filter-group price-filter">
          <legend>Price</legend>
          <div>
            <label>
              Min
              <input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </label>
            <label>
              Max
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPriceChange(minPrice, maxPrice)}
          >
            Apply price
          </button>
        </fieldset>
        {facets.map((facet) => (
          <fieldset className="filter-group" key={facet.key}>
            <legend>
              {facet.label}
              {facet.unit ? ` (${facet.unit})` : ""}
            </legend>
            {facet.options.map((option) => (
              <label className="filter-option" key={option.value}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selectedValues(params, facet.key).includes(
                    option.value,
                  )}
                  onChange={(event) =>
                    toggleValue(facet.key, option.value, event.target.checked)
                  }
                />
                <span>{option.label}</span>
                <small>{option.count}</small>
              </label>
            ))}
          </fieldset>
        ))}
        {facets.length === 0 && (
          <p className="filter-help">
            Choose a category to see specification filters from available
            products.
          </p>
        )}
      </div>
    </aside>
  );
}
