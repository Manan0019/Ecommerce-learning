import pool from "../config/db.js";
import { getSpecificationDefinition } from "../config/productSpecifications.js";
import {
  buildSpecificationFacets,
  definitionFields,
  publicSpecificationValues
} from "../services/productSpecificationService.js";

const selectFields = `
  product.id, product.name, product.description, product.category_id,
  category.name AS category_name, category.slug AS category_slug,
  product.brand, product.model, product.specifications,
  pricing.effective_price AS price, pricing.effective_mrp AS mrp, pricing.effective_stock AS stock,
  pricing.has_variants, product.image_url, product.created_at`;

// One row per parent product, even when it has many variants.
// Existing products without configured variants retain their original price/stock.
const pricingJoin = `
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) > 0 AS has_variants,
      COALESCE((SELECT v.price FROM product_variants v
        WHERE v.product_id=product.id AND v.is_active
        ORDER BY CASE WHEN v.stock>0 THEN 0 ELSE 1 END, v.price, v.id LIMIT 1), product.price) AS effective_price,
      COALESCE((SELECT v.mrp FROM product_variants v
        WHERE v.product_id=product.id AND v.is_active
        ORDER BY CASE WHEN v.stock>0 THEN 0 ELSE 1 END, v.price, v.id LIMIT 1), product.mrp) AS effective_mrp,
      CASE WHEN COUNT(*)>0 THEN COALESCE(SUM(v.stock) FILTER (WHERE v.is_active),0)::integer
        ELSE product.stock END AS effective_stock
    FROM product_variants v WHERE v.product_id=product.id
  ) pricing ON TRUE`;

const searchDocument = `to_tsvector(
  'simple'::regconfig,
  coalesce(product.name, '') || ' ' || coalesce(product.brand, '') || ' ' ||
  coalesce(product.model, '') || ' ' || coalesce(product.description, '') || ' ' ||
  coalesce(product.specifications::text, '')
)`;

function asPublicProduct(product) {
  return {
    id: String(product.id),
    name: product.name,
    description: product.description,
    categoryId: String(product.category_id),
    category: product.category_name,
    categorySlug: product.category_slug,
    brand: product.brand,
    model: product.model,
    specifications: product.specifications || {},
    price: product.price,
    mrp: product.mrp,
    stock: product.stock,
    hasVariants: product.has_variants,
    imageUrl: product.image_url,
    createdAt: product.created_at
  };
}

function queryString(value, maxLength) {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error("INVALID_PUBLIC_QUERY");
  const clean = value.trim();
  if (clean.length > maxLength) throw new Error("INVALID_PUBLIC_QUERY");
  return clean;
}

function positiveInteger(value, fallback, max) {
  if (value === undefined || value === "") return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw new Error("INVALID_PUBLIC_QUERY");
  const number = Number(value);
  if (number > max) throw new Error("INVALID_PUBLIC_QUERY");
  return number;
}

function priceValue(value) {
  if (value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("INVALID_PUBLIC_QUERY");
  }
  return Number(value);
}

function filterValues(value) {
  if (typeof value !== "string" || value.length > 500) throw new Error("INVALID_PUBLIC_QUERY");
  const values = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  if (!values.length || values.length > 20 || values.some((item) => item.length > 100)) {
    throw new Error("INVALID_PUBLIC_QUERY");
  }
  return values;
}

export async function listProducts(req, res) {
  try {
    const q = queryString(req.query.q, 120);
    const categoryValue = queryString(req.query.category, 100);
    const sort = queryString(req.query.sort, 30) || (q ? "relevance" : "newest");
    const page = positiveInteger(req.query.page, 1, 10_000);
    const limit = positiveInteger(req.query.limit, 12, 48);
    const minPrice = priceValue(req.query.minPrice);
    const maxPrice = priceValue(req.query.maxPrice);
    const inStock = req.query.inStock === "true";
    if (req.query.inStock !== undefined && !["true", "false"].includes(req.query.inStock)) throw new Error("INVALID_PUBLIC_QUERY");
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) throw new Error("INVALID_PUBLIC_QUERY");
    if (!new Set(["relevance", "newest", "price_asc", "price_desc", "name"]).has(sort)) {
      throw new Error("INVALID_PUBLIC_QUERY");
    }

    let category = null;
    if (categoryValue) {
      const result = await pool.query(`
        SELECT id, name, slug FROM categories
        WHERE is_active = TRUE AND (slug = $1 OR lower(name) = lower($1))
        LIMIT 1
      `, [categoryValue]);
      if (!result.rows.length) {
        return res.json({ products: [], pagination: { page, limit, total: 0, pages: 0 }, facets: [], category: null });
      }
      category = result.rows[0];
    }

    const definition = category ? getSpecificationDefinition(category) : null;
    const filterSchemas = new Map(
      definition ? definitionFields(definition).filter((item) => item.filter).map((item) => [item.key, item]) : []
    );
    const baseKeys = new Set(["q", "category", "sort", "page", "limit", "minPrice", "maxPrice", "brand", "inStock"]);
    const requestedFilters = [];
    for (const [key, value] of Object.entries(req.query)) {
      if (baseKeys.has(key)) continue;
      const schema = filterSchemas.get(key);
      if (!schema) throw new Error("INVALID_PUBLIC_QUERY");
      const values = filterValues(value);
      if (schema.options && values.some((item) => !schema.options.includes(item))) {
        throw new Error("INVALID_PUBLIC_QUERY");
      }
      if (schema.type === "boolean" && values.some((item) => item !== "true" && item !== "false")) {
        throw new Error("INVALID_PUBLIC_QUERY");
      }
      if (schema.type === "number" && values.some((item) => {
        const number = Number(item);
        return !Number.isFinite(number) || number < schema.min || number > schema.max;
      })) throw new Error("INVALID_PUBLIC_QUERY");
      requestedFilters.push({ schema, values });
    }

    const values = [];
    const where = ["product.is_active = TRUE", "category.is_active = TRUE"];
    const parameter = (value) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (category) where.push(`category.id = ${parameter(category.id)}`);
    if (inStock) where.push("pricing.effective_stock > 0");
    let searchParameter = null;
    if (q) {
      searchParameter = parameter(q);
      const escapedLike = q.replace(/[\\%_]/g, (match) => `\\${match}`);
      const likeParameter = parameter(`%${escapedLike}%`);
      where.push(`(${searchDocument} @@ websearch_to_tsquery('simple'::regconfig, ${searchParameter}) OR product.name ILIKE ${likeParameter} ESCAPE '\\' OR product.brand ILIKE ${likeParameter} ESCAPE '\\' OR product.model ILIKE ${likeParameter} ESCAPE '\\')`);
    }
    if (minPrice !== null) where.push(`pricing.effective_price >= ${parameter(minPrice)}`);
    if (maxPrice !== null) where.push(`pricing.effective_price <= ${parameter(maxPrice)}`);

    if (req.query.brand !== undefined) {
      const brands = filterValues(req.query.brand).map((brand) => brand.toLowerCase());
      where.push(`lower(product.brand) = ANY(${parameter(brands)}::text[])`);
    }
    for (const { schema, values: selected } of requestedFilters) {
      const keyParameter = parameter(schema.key);
      const valuesParameter = parameter(selected);
      where.push(schema.type === "multiSelect"
        ? `(product.specifications -> ${keyParameter}) ?| ${valuesParameter}::text[]`
        : `product.specifications ->> ${keyParameter} = ANY(${valuesParameter}::text[])`);
    }

    const whereSql = where.join(" AND ");
    const countResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      ${pricingJoin}
      WHERE ${whereSql}
    `, values);
    const total = countResult.rows[0].total;
    const pages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage = pages === 0 ? 1 : Math.min(page, pages);
    const orderBy = {
      relevance: searchParameter
        ? `ts_rank(${searchDocument}, websearch_to_tsquery('simple'::regconfig, ${searchParameter})) DESC, product.id DESC`
        : "product.created_at DESC, product.id DESC",
      newest: "product.created_at DESC, product.id DESC",
      price_asc: "pricing.effective_price ASC, product.id DESC",
      price_desc: "pricing.effective_price DESC, product.id DESC",
      name: "product.name ASC, product.id DESC"
    }[sort];
    const dataValues = [...values, limit, (safePage - 1) * limit];
    const { rows } = await pool.query(`
      SELECT ${selectFields}
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      ${pricingJoin}
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, dataValues);

    const facetValues = category ? [category.id] : [];
    const facetCategory = category ? "AND category.id = $1" : "";
    const facetResult = await pool.query(`
      SELECT product.brand, product.specifications
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      WHERE product.is_active = TRUE AND category.is_active = TRUE ${facetCategory}
      ORDER BY product.id DESC
      LIMIT 1000
    `, facetValues);
    const builtFacets = buildSpecificationFacets(category || {}, facetResult.rows).facets;

    return res.json({
      products: rows.map(asPublicProduct),
      pagination: { page: safePage, limit, total, pages },
      facets: category ? builtFacets : builtFacets.filter((facet) => facet.key === "brand"),
      category: category ? { id: String(category.id), name: category.name, slug: category.slug } : null
    });
  } catch (error) {
    if (error.message === "INVALID_PUBLIC_QUERY") {
      return res.status(400).json({ message: "Invalid search or filter parameters." });
    }
    console.error("Public product list:", error);
    return res.status(500).json({ message: "Could not load products." });
  }
}

export async function getProduct(req, res) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }
  try {
    const { rows } = await pool.query(`
      SELECT ${selectFields}
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      ${pricingJoin}
      WHERE product.id = $1 AND product.is_active = TRUE AND category.is_active = TRUE
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Product not found or inactive." });
    const product = asPublicProduct(rows[0]);
    return res.json({
      product: {
        ...product,
        specificationDisplay: publicSpecificationValues(
          { name: product.category, slug: product.categorySlug },
          product.specifications
        )
      }
    });
  } catch (error) {
    console.error("Public product details:", error);
    return res.status(500).json({ message: "Could not load product." });
  }
}
