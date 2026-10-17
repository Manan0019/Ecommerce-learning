export function validateVariantDrafts(rows) {
  const skus = new Set();
  const combinations = new Set();
  return rows.map((row, index) => {
    const sku = row.sku.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/.test(sku))
      throw Error(
        `Variant ${index + 1}: SKU must have 2–80 letters, digits, _ or -.`,
      );
    if (skus.has(sku.toLowerCase())) throw Error(`Duplicate SKU: ${sku}`);
    skus.add(sku.toLowerCase());
    const attributes = {};
    for (const line of row.attributesText.split("\n")) {
      if (!line.trim()) continue;
      const separator = line.indexOf(":");
      if (separator <= 0)
        throw Error(`SKU ${sku}: use Attribute: Value on each line.`);
      const key = line
        .slice(0, separator)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      const value = line.slice(separator + 1).trim();
      if (
        !/^[a-z][a-z0-9_]{0,39}$/.test(key) ||
        !value ||
        value.length > 80 ||
        key in attributes
      )
        throw Error(`SKU ${sku}: invalid/duplicate attribute.`);
      attributes[key] = value;
    }
    if (Object.keys(attributes).length > 10)
      throw Error(`SKU ${sku}: maximum 10 attributes.`);
    const canonical = JSON.stringify(
      Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b)),
    );
    if (combinations.has(canonical))
      throw Error(`SKU ${sku}: duplicate configuration.`);
    combinations.add(canonical);
    if (
      !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(row.price) ||
      Number(row.price) <= 0
    )
      throw Error(`SKU ${sku}: invalid price.`);
    if (
      !/^(?:0|[1-9]\d*)$/.test(row.stock) ||
      !Number.isSafeInteger(Number(row.stock)) ||
      Number(row.stock) > 2147483647
    )
      throw Error(`SKU ${sku}: invalid stock.`);
    return { ...row, sku, attributes };
  });
}
