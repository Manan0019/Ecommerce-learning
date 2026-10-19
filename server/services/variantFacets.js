/** Build customer filters from actual active SKU options (Size, Color, RAM, Storage, etc).
 * Query rows contain a JSONB array of variant-attribute objects per parent product.
 * No hard-coded category-specific option names are required. */
export function buildVariantFacets(rows) {
  const attributes = new Map();
  for (const row of rows) {
    for (const variant of (Array.isArray(row.variant_attributes) ? row.variant_attributes : [])) {
      if (!variant || typeof variant !== "object" || Array.isArray(variant)) continue;
      for (const [key, rawValue] of Object.entries(variant)) {
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(key) || typeof rawValue !== "string") continue;
        const value = rawValue.trim();
        if (!value || value.length > 100) continue;
        if (!attributes.has(key)) attributes.set(key, new Map());
        const counts = attributes.get(key);
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
  }
  return [...attributes].filter(([, values]) => values.size > 1).map(([attributeKey, values]) => ({
    key: `variant_${attributeKey}`,
    attributeKey,
    label: ({ ram: "RAM", ssd: "SSD", cpu: "CPU", gpu: "GPU" })[attributeKey] ||
      attributeKey.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()),
    type: "select",
    options: [...values].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
      .slice(0, 100).map(([value, count]) => ({ value, label: value, count }))
  })).sort((left, right) => {
    const priorities = ["variant_size", "variant_color", "variant_colour", "variant_ram", "variant_system_memory", "variant_storage"];
    const a = priorities.indexOf(left.key); const b = priorities.indexOf(right.key);
    return (a < 0 ? 100 : a) - (b < 0 ? 100 : b) || left.label.localeCompare(right.label);
  });
}

/** All chosen filters must be satisfied by the SAME SKU. */
export function matchesVariantFacets(attributes, filters) {
  return filters.every(({ attributeKey, values }) => values.includes(attributes?.[attributeKey]));
}
