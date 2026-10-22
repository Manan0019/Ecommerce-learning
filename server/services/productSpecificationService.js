import { getSpecificationDefinition } from "../config/productSpecifications.js";

export function definitionFields(definition) {
  return definition.groups.flatMap((group) => group.fields);
}

export function validateSpecifications(category, input, legacySpecifications = {}) {
  let value = input;
  if (typeof value === "string") {
    if (value.length > 20_000) throw new Error("INVALID_SPECIFICATIONS");
    try { value = JSON.parse(value); } catch { throw new Error("INVALID_SPECIFICATIONS"); }
  }
  if (value === undefined || value === null) value = {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_SPECIFICATIONS");

  const definition = getSpecificationDefinition(category);
  const fields = new Map(definitionFields(definition).map((item) => [item.key, item]));
  const entries = Object.entries(value);
  if (entries.length > fields.size + Object.keys(legacySpecifications || {}).length) throw new Error("INVALID_SPECIFICATIONS");

  const specifications = {};
  for (const [key, rawValue] of entries) {
    const schema = fields.get(key);
    // Existing records may contain specifications from the old generic Electronics
    // schema. Preserve unmodified historical values when editing the same category.
    if (!schema) {
      if (Object.prototype.hasOwnProperty.call(legacySpecifications || {}, key) &&
          JSON.stringify(rawValue) === JSON.stringify(legacySpecifications[key])) {
        specifications[key] = rawValue;
        continue;
      }
      throw new Error("INVALID_SPECIFICATIONS");
    }
    if (rawValue === "" || rawValue === null || rawValue === undefined) continue;

    if (schema.type === "text") {
      if (typeof rawValue !== "string") throw new Error("INVALID_SPECIFICATIONS");
      const clean = rawValue.trim().replace(/\s+/g, " ");
      if (!clean || clean.length > (schema.maxLength || 200)) throw new Error("INVALID_SPECIFICATIONS");
      specifications[key] = clean;
      continue;
    }

    if (schema.type === "number") {
      const number = typeof rawValue === "number" ? rawValue : Number(rawValue);
      if (!Number.isFinite(number) || number < schema.min || number > schema.max) {
        throw new Error("INVALID_SPECIFICATIONS");
      }
      specifications[key] = number;
      continue;
    }

    if (schema.type === "select") {
      if (typeof rawValue !== "string" || !schema.options.includes(rawValue)) {
        throw new Error("INVALID_SPECIFICATIONS");
      }
      specifications[key] = rawValue;
      continue;
    }

    if (schema.type === "boolean") {
      if (typeof rawValue !== "boolean") throw new Error("INVALID_SPECIFICATIONS");
      specifications[key] = rawValue;
      continue;
    }

    if (schema.type === "multiSelect") {
      if (!Array.isArray(rawValue) || rawValue.length > schema.options.length) {
        throw new Error("INVALID_SPECIFICATIONS");
      }
      const unique = [...new Set(rawValue)];
      if (unique.length !== rawValue.length || unique.some((item) =>
        typeof item !== "string" || !schema.options.includes(item))) {
        throw new Error("INVALID_SPECIFICATIONS");
      }
      if (unique.length) specifications[key] = unique;
      continue;
    }

    throw new Error("INVALID_SPECIFICATIONS");
  }

  return { definition, specifications };
}

export function buildSpecificationFacets(category, products) {
  const definition = getSpecificationDefinition(category);
  const filterFields = definitionFields(definition).filter((item) => item.filter);
  const facets = [];

  const brands = new Map();
  for (const product of products) {
    if (product.brand) brands.set(product.brand, (brands.get(product.brand) || 0) + 1);
  }
  if (brands.size) {
    facets.push({
      key: "brand",
      label: "Brand",
      type: "text",
      options: [...brands].sort(([left], [right]) => left.localeCompare(right))
        .map(([value, count]) => ({ value, label: value, count }))
    });
  }

  for (const schema of filterFields) {
    const values = new Map();
    for (const product of products) {
      const stored = product.specifications?.[schema.key];
      const candidates = Array.isArray(stored) ? stored : [stored];
      for (const candidate of candidates) {
        if (candidate === undefined || candidate === null || candidate === "") continue;
        const value = String(candidate);
        values.set(value, (values.get(value) || 0) + 1);
      }
    }
    if (!values.size) continue;
    const order = schema.options
      ? (left, right) => schema.options.indexOf(left[0]) - schema.options.indexOf(right[0])
      : (left, right) => String(left[0]).localeCompare(String(right[0]), undefined, { numeric: true });
    facets.push({
      key: schema.key,
      label: schema.label,
      type: schema.type,
      unit: schema.unit || null,
      options: [...values].sort(order).map(([value, count]) => ({
        value,
        label: schema.type === "boolean" ? (value === "true" ? "Yes" : "No") : value,
        count
      }))
    });
  }
  return { definition, facets };
}

export function publicSpecificationValues(category, specifications) {
  const definition = getSpecificationDefinition(category);
  const groups = definition.groups.map((group) => ({
    label: group.label,
    items: group.fields.flatMap((schema) => {
      const value = specifications?.[schema.key];
      if (value === undefined || value === null || value === "" ||
          (Array.isArray(value) && value.length === 0)) return [];
      return [{
        key: schema.key,
        label: schema.label,
        value,
        type: schema.type,
        unit: schema.unit || null
      }];
    })
  })).filter((group) => group.items.length);
  const recognized=new Set(definitionFields(definition).map(x=>x.key));
  const extra=Object.entries(specifications||{}).filter(([key,value])=>!recognized.has(key) && value!==null && value!=='' && value!==undefined);
  if(extra.length)groups.push({label:'Additional saved details',items:extra.slice(0,30).map(([key,value])=>({
    key,label:key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^(.)/,x=>x.toUpperCase()),value,type:Array.isArray(value)?'multiSelect':typeof value==='boolean'?'boolean':'text',unit:null
  }))});
  return { type: definition.type, label: definition.label, groups };
}
