// Pure helper: generates editable React draft rows, never writes to the server.
const MAX_VALUE_LENGTH = 80;
function parseValues(input, label) {
  const entries = input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (!entries.length) throw Error(`${label} needs at least one value.`);
  if (entries.some((v) => v.length > MAX_VALUE_LENGTH || /[:\n\r]/.test(v)))
    throw Error(`${label} contains an invalid value.`);
  const normalized = new Set(entries.map((v) => v.toLocaleLowerCase()));
  if (normalized.size !== entries.length)
    throw Error(`${label} contains duplicate values.`);
  return entries;
}
function normalizeName(value) {
  const name = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(name))
    throw Error(
      "Attribute names must start with a letter and contain letters, numbers or underscores.",
    );
  return name;
}
function skuToken(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function canonical(attributesText) {
  const pairs = attributesText
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(":");
      if (at < 1) return null;
      return [
        line.slice(0, at).trim().toLowerCase().replace(/\s+/g, "_"),
        line
          .slice(at + 1)
          .trim()
          .toLowerCase(),
      ];
    });
  if (pairs.some((x) => !x)) return null;
  return JSON.stringify(pairs.sort(([a], [b]) => a.localeCompare(b)));
}
export function buildVariantDrafts({
  nameA,
  valuesA,
  nameB,
  valuesB,
  skuPrefix,
  defaultPrice,
  defaultStock,
  existing = [],
  limit = 30,
}) {
  const keyA = normalizeName(nameA);
  const first = parseValues(valuesA, "First attribute");
  const hasSecond = Boolean(valuesB.trim());
  const keyB = hasSecond ? normalizeName(nameB) : null;
  if (hasSecond && keyA === keyB)
    throw Error("The two attribute names must be different.");
  const second = hasSecond ? parseValues(valuesB, "Second attribute") : [null];
  const count = first.length * second.length;
  if (count > limit || existing.length + count > limit)
    throw Error(
      `Too many combinations. Limit: ${limit} variant drafts including existing rows.`,
    );
  const prefix = skuToken(skuPrefix);
  if (!prefix || prefix.length > 40)
    throw Error(
      "Enter a valid SKU prefix (max 40 characters after normalization).",
    );
  if (
    !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(String(defaultPrice)) ||
    Number(defaultPrice) <= 0
  )
    throw Error("Enter a valid default price greater than zero.");
  if (
    !/^(?:0|[1-9]\d*)$/.test(String(defaultStock)) ||
    Number(defaultStock) > 2147483647
  )
    throw Error("Enter a valid non-negative stock quantity.");
  const seenSkus = new Set(
    existing.map((v) => v.sku.trim().toLowerCase()).filter(Boolean),
  );
  const seenCombinations = new Set(
    existing.map((v) => canonical(v.attributesText)).filter(Boolean),
  );
  const drafts = [];
  for (const a of first)
    for (const b of second) {
      const attributesText =
        `${keyA}: ${a}` + (b === null ? "" : `\n${keyB}: ${b}`);
      const combination = canonical(attributesText);
      if (seenCombinations.has(combination)) continue;
      const sku = [
        prefix,
        skuToken(a),
        ...(b === null ? [] : [skuToken(b)]),
      ].join("-");
      if (!/^[A-Z0-9][A-Z0-9_-]{1,79}$/.test(sku))
        throw Error(
          `Cannot make a valid SKU for ${a}${b === null ? "" : ` / ${b}`}. Edit the values or prefix.`,
        );
      if (seenSkus.has(sku.toLowerCase()))
        throw Error(
          `Generated SKU collision: ${sku}. Edit existing entries or use another prefix.`,
        );
      seenSkus.add(sku.toLowerCase());
      seenCombinations.add(combination);
      drafts.push({
        key: crypto.randomUUID(),
        sku,
        attributesText,
        price: String(defaultPrice),
        stock: String(defaultStock),
        isActive: true,
      });
    }
  return drafts;
}
