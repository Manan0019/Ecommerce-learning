import { activeCatalogueFilters } from "../../services/activeFilters";

export default function ActiveFilterChips({ params, facets, onRemove, onClear }) {
  const chips = activeCatalogueFilters(params, facets);
  if (!chips.length) return null;
  return <div className="nx32-active-filters" aria-label="Active product filters">
    <span className="nx32-filter-label">Showing results for</span>
    {chips.map((chip) => <button
      key={`${chip.key}:${chip.value ?? ""}`}
      type="button"
      className="nx32-filter-pill"
      onClick={() => onRemove(chip)}
      aria-label={`Remove ${chip.label} filter`}
    >
      {chip.label}<span aria-hidden="true">×</span>
    </button>)}
    <button className="nx32-filter-clear" type="button" onClick={onClear}>Clear filters</button>
  </div>;
}
