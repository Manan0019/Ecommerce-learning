export function normalizeCategoryName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 80 ? name : null;
}

export function categorySlugBase(name) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "category";
}

export async function createUniqueCategorySlug(database, name, excludeId = null) {
  const base = categorySlugBase(name);
  for (let suffix = 1; suffix <= 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base.slice(0, 94 - String(suffix).length)}-${suffix}`;
    const { rows } = await database.query(
      `SELECT 1 FROM categories
       WHERE slug = $1 AND ($2::bigint IS NULL OR id <> $2)
       LIMIT 1`,
      [candidate, excludeId]
    );
    if (!rows.length) return candidate;
  }
  throw new Error("CATEGORY_SLUG_UNAVAILABLE");
}
