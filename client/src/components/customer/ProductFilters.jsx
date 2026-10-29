import { Button, Checkbox, FormField, Select } from "../ui/index";
import { useState } from "react";
import PriceRangeSlider from "./PriceRangeSlider";

function selectedValues(params, key) {
  return (params.get(key) || "").split(",").filter(Boolean);
}

export default function ProductFilters({
  facets,
  params,
  onFilterChange,
  onPriceChange,
  disabled,
  priceBounds,
}) {
  return (
    <ProductFiltersContent
      facets={facets}
      params={params}
      onFilterChange={onFilterChange}
      onPriceChange={onPriceChange}
      priceBounds={priceBounds}
      disabled={disabled}
    />
  );
}

function ProductFiltersContent({
  facets,
  params,
  onFilterChange,
  onPriceChange,
  priceBounds,
  disabled,
}) {
  const [open, setOpen] = useState(false);

  function toggleValue(key, value, checked) {
    const selected = new Set(selectedValues(params, key));
    if (checked) selected.add(value);
    else selected.delete(value);
    onFilterChange(key, [...selected]);
  }

  const inStock = params.get("inStock") === "true";

  return (
    <aside className={`catalogue-filters ${open ? "is-open" : ""}`}>
      <Button variant="plain"
        className="filter-mobile-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Hide filters" : "Show filters"}
      </Button>
      <div className="filter-panel">
        <div className="filter-panel-heading">
          <h2>Filters</h2>
        </div>
        <fieldset className="filter-group">
          <legend>Availability</legend>
          <FormField inline className="filter-option">
            <Checkbox
              type="checkbox"
              disabled={disabled}
              checked={inStock}
              onChange={(event) =>
                onFilterChange("inStock", event.target.checked ? ["true"] : [])
              }
            />
            <span>In stock only</span>
          </FormField>
        </fieldset>
        <fieldset className="filter-group">
          <legend>Customer rating</legend>
          <Select aria-label="Minimum customer rating" disabled={disabled}
            value={params.get('minRating') || ''}
            onChange={event => onFilterChange('minRating',event.target.value ? [event.target.value] : [])}>
            <option value="">All ratings</option>
            <option value="4">4 stars & up</option>
            <option value="3">3 stars & up</option>
            <option value="2">2 stars & up</option>
          </Select>
          <small className="filter-help">Only verified, approved customer reviews count.</small>
        </fieldset>
        <fieldset className="filter-group price-filter nx28-price-filter">
          <legend>Price range</legend>
          <PriceRangeSlider
            priceBounds={priceBounds}
            params={params}
            disabled={disabled}
            onPriceChange={onPriceChange}
          />
        </fieldset>
        {facets.map((facet) => (
          <fieldset className="filter-group" key={facet.key}>
            <legend>
              {facet.label}
              {facet.unit ? ` (${facet.unit})` : ""}
            </legend>
            {facet.options.map((option) => (
              <FormField inline className="filter-option" key={option.value}>
                <Checkbox
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
              </FormField>
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
