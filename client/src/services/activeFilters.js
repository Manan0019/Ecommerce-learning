// URL-only display data: never replaces the server's real product filtering.
export function activeCatalogueFilters(params, facets = []) {
  const chips = [];
  const query = params.get("q");
  if (query) chips.push({ key: "q", label: `Search: ${query}` });
  if (params.get("inStock") === "true") chips.push({ key: "inStock", label: "In stock" });
  const min = params.get("minPrice");
  const max = params.get("maxPrice");
  if (min) chips.push({ key: "minPrice", label: `From ₹${Number(min).toLocaleString("en-IN")}` });
  if (max) chips.push({ key: "maxPrice", label: `Up to ₹${Number(max).toLocaleString("en-IN")}` });
  for (const facet of facets) {
    const selected = (params.get(facet.key) || "").split(",").filter(Boolean);
    for (const value of selected) {
      const option = facet.options?.find((item) => String(item.value) === String(value));
      chips.push({ key: facet.key, value, label: `${facet.label}: ${option?.label || value}` });
    }
  }
  return chips;
}

export function removeCatalogueFilter(params, chip) {
  const next = new URLSearchParams(params);
  if (chip.value == null) next.delete(chip.key);
  else {
    const values = (next.get(chip.key) || "").split(",").filter((value) => value && value !== chip.value);
    if (values.length) next.set(chip.key, values.join(","));
    else next.delete(chip.key);
  }
  next.delete("page");
  return next;
}
