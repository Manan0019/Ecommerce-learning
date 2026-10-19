import pool from "../config/db.js";
import { availabilityPredicate } from "../services/catalogueAvailability.js";
import { makeStorefrontCards } from "../services/storefrontVariantCards.js";
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
  pricing.has_variants, product.is_featured, product.image_url, product.created_at`;

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
    isFeatured: Boolean(product.is_featured),
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
    const featured = req.query.featured === "true";
    const requestedView = queryString(req.query.view, 12) || "variants";
    if (!["variants", "colors", "products"].includes(requestedView)) throw new Error("INVALID_PUBLIC_QUERY");
    const view = featured ? "products" : requestedView;
    if (req.query.featured !== undefined && !["true", "false"].includes(req.query.featured)) throw new Error("INVALID_PUBLIC_QUERY");
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
    const baseKeys = new Set(["q", "category", "sort", "page", "limit", "minPrice", "maxPrice", "brand", "inStock", "featured", "view"]);
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
    if (category) {
      // Nested categories: selecting Electronics also finds all descendants.
      where.push(`category.id IN (
        WITH RECURSIVE subtree AS (
          SELECT id FROM categories WHERE id = ${parameter(category.id)}
          UNION ALL SELECT child.id FROM categories child JOIN subtree parent ON child.parent_id=parent.id WHERE child.is_active=TRUE
        ) SELECT id FROM subtree
      )`);
    }
    if (inStock) where.push(availabilityPredicate(view));
    if (featured) where.push("product.is_featured = TRUE");
    let searchParameter = null;
    if (q) {
      searchParameter = parameter(q);
      const escapedLike = q.replace(/[\\%_]/g, (match) => `\\${match}`);
      const likeParameter = parameter(`%${escapedLike}%`);
      where.push(`(${searchDocument} @@ websearch_to_tsquery('simple'::regconfig, ${searchParameter}) OR product.name ILIKE ${likeParameter} ESCAPE '\\' OR product.brand ILIKE ${likeParameter} ESCAPE '\\' OR product.model ILIKE ${likeParameter} ESCAPE '\\'${view === "variants" ? ` OR chosen.sku ILIKE ${likeParameter} ESCAPE '\\' OR chosen.custom_title ILIKE ${likeParameter} ESCAPE '\\' OR chosen.attributes::text ILIKE ${likeParameter} ESCAPE '\\'` : ""})`);
    }
    if (minPrice !== null) where.push(`${view === "variants" ? "COALESCE(chosen.price,product.price)" : "pricing.effective_price"} >= ${parameter(minPrice)}`);
    if (maxPrice !== null) where.push(`${view === "variants" ? "COALESCE(chosen.price,product.price)" : "pricing.effective_price"} <= ${parameter(maxPrice)}`);

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

    // Each SKU is paginated as its own public card in variants mode.
    // Parents with no SKUs still have one catalogue card (chosen.id is NULL).
    const chosenJoin = view === "variants" ? `
      LEFT JOIN LATERAL (
        SELECT v.id,v.sku,v.custom_title,v.attributes,v.price,v.mrp,v.stock
        FROM product_variants v WHERE v.product_id=product.id AND v.is_active=TRUE
      ) chosen ON TRUE` : "";
    if (view === "variants") where.push("(chosen.id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM product_variants old WHERE old.product_id=product.id))");
    const finalWhere = where.join(" AND ");
    const countResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      ${pricingJoin}
      ${chosenJoin}
      WHERE ${finalWhere}
    `, values);
    const total = countResult.rows[0].total;
    const pages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage = pages === 0 ? 1 : Math.min(page, pages);
    const orderBy = {
      relevance: searchParameter
        ? `ts_rank(${searchDocument}, websearch_to_tsquery('simple'::regconfig, ${searchParameter})) DESC, product.id DESC`
        : "product.created_at DESC, product.id DESC",
      newest: "product.created_at DESC, product.id DESC",
      price_asc: `${view === "variants" ? "COALESCE(chosen.price,product.price)" : "pricing.effective_price"} ASC, product.id DESC${view === "variants" ? ", chosen.id ASC" : ""}`,
      price_desc: `${view === "variants" ? "COALESCE(chosen.price,product.price)" : "pricing.effective_price"} DESC, product.id DESC${view === "variants" ? ", chosen.id ASC" : ""}`,
      name: "product.name ASC, product.id DESC"
    }[sort];
    const dataValues = [...values, limit, (safePage - 1) * limit];
    const { rows } = await pool.query(`
      SELECT ${selectFields}${view === "variants" ? `, chosen.id AS chosen_variant_id, chosen.sku AS chosen_sku, chosen.custom_title AS chosen_title, chosen.attributes AS chosen_attributes, chosen.price AS chosen_price, chosen.mrp AS chosen_mrp, chosen.stock AS chosen_stock` : ""}
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      ${pricingJoin}
      ${chosenJoin}
      WHERE ${finalWhere}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, dataValues);

    const facetValues = category ? [category.id] : [];
    const facetCategory = category ? `AND category.id IN (
      WITH RECURSIVE subtree AS (
        SELECT id FROM categories WHERE id=$1
        UNION ALL SELECT child.id FROM categories child JOIN subtree parent ON child.parent_id=parent.id WHERE child.is_active=TRUE
      ) SELECT id FROM subtree
    )` : "";
    const facetResult = await pool.query(`
      SELECT product.brand, product.specifications
      FROM products AS product
      JOIN categories AS category ON category.id = product.category_id
      WHERE product.is_active = TRUE AND category.is_active = TRUE ${facetCategory}
      ORDER BY product.id DESC
      LIMIT 1000
    `, facetValues);
    const builtFacets = buildSpecificationFacets(category || {}, facetResult.rows).facets;

    const parentProducts = rows.map(asPublicProduct);
    let cards = parentProducts;
    if (view === "variants") {
      const ids = [...new Set(rows.map(row => String(row.id)))];
      const mediaResult = ids.length ? await pool.query(`SELECT id,product_id,variant_id,option_key,option_value,media_type,media_url,sort_order,is_card_cover
        FROM product_media WHERE product_id=ANY($1::bigint[]) AND media_type='image'
        ORDER BY sort_order,id`, [ids]) : {rows:[]};
      const pictures = mediaResult.rows;
      cards = rows.map((row, i) => {
        if (!row.chosen_variant_id) return { ...parentProducts[i], cardKey: `${row.id}:base` };
        const attrs = row.chosen_attributes || {};
        const color = Object.entries(attrs).find(([k]) => /^(color|colour)$/i.test(k))?.[1] || null;
        const images = pictures.filter(p => String(p.product_id) === String(row.id));
        const exact = images.filter(p => String(p.variant_id) === String(row.chosen_variant_id));
        const matchColor = images.filter(p => p.variant_id == null && /^(color|colour)$/i.test(p.option_key || "") &&
          String(p.option_value).toLowerCase() === String(color).toLowerCase());
        const ordered = entries => [...entries].sort((a,b)=>Number(Boolean(b.is_card_cover))-Number(Boolean(a.is_card_cover)) || a.sort_order-b.sort_order || a.id-b.id);
        const photo = ordered(exact.filter(p=>p.is_card_cover))[0] || ordered(matchColor.filter(p=>p.is_card_cover))[0] || ordered(matchColor)[0] || ordered(exact)[0];
        const custom = row.chosen_title?.trim();
        const suffix = Object.values(attrs).join(' / ');
        return { ...parentProducts[i], cardKey: `${row.id}:sku:${row.chosen_variant_id}`,
          parentProductId: String(row.id), selectedVariantId:String(row.chosen_variant_id),
          sku:row.chosen_sku, name:custom || `${row.name}${suffix ? ` — ${suffix}` : ''}`,
          colorLabel:color, price:row.chosen_price,mrp:row.chosen_mrp,stock:row.chosen_stock,
          imageUrl:photo?.media_url || row.image_url };
      });
    } else if (view === "colors" && rows.length) {
      const ids = rows.map(row => String(row.id));
      const [variantResult,mediaResult] = await Promise.all([
        pool.query(`SELECT id,product_id,attributes,sku,mrp,price,stock,is_active,custom_title FROM product_variants WHERE product_id=ANY($1::bigint[]) AND is_active=TRUE ORDER BY product_id,id`,[ids]),
        pool.query(`SELECT id,product_id,variant_id,option_key,option_value,media_type,media_url,sort_order,is_card_cover FROM product_media WHERE product_id=ANY($1::bigint[]) AND media_type='image' ORDER BY product_id,sort_order,id`,[ids])
      ]);
      cards = makeStorefrontCards(parentProducts,variantResult.rows,mediaResult.rows);
    }
    return res.json({
      products: cards,
      pagination: { page: safePage, limit, total, pages },
      facets: category ? builtFacets : builtFacets.filter((facet) => facet.key === "brand"),
      category: category ? { id: String(category.id), name: category.name, slug: category.slug } : null,
      view, countUnit: view === "variants" ? "configurations" : "product styles"
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


/** Small, bounded autocomplete. Active catalogue only; no fabricated results. */
export async function searchSuggestions(req, res) {
  try {
    const q = queryString(req.query.q, 80);
    if (q.length < 2) return res.json({ products: [], categories: [] });
    const term = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const prefix = `${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const [productResult, categoryResult] = await Promise.all([
      pool.query(`
        SELECT product.id, product.name, product.brand, product.image_url,
               category.name AS category_name, category.slug AS category_slug
        FROM products product
        JOIN categories category ON category.id = product.category_id
        WHERE product.is_active = TRUE AND category.is_active = TRUE
          AND (product.name ILIKE $1 ESCAPE '\\' OR product.brand ILIKE $1 ESCAPE '\\' OR product.model ILIKE $1 ESCAPE '\\')
        ORDER BY CASE WHEN product.name ILIKE $2 ESCAPE '\\' THEN 0 ELSE 1 END,
                 product.name ASC, product.id DESC
        LIMIT 6`, [term, prefix]),
      pool.query(`SELECT id, name, slug FROM categories WHERE is_active = TRUE AND name ILIKE $1 ESCAPE '\\' ORDER BY name LIMIT 4`, [term])
    ]);
    const resultProducts = productResult.rows.map(r => ({ id: String(r.id), name: r.name, brand: r.brand, imageUrl: r.image_url, category: r.category_name }));
    let suggestedCards = resultProducts;
    if (resultProducts.length) {
      const ids = resultProducts.map(p => p.id);
      const [variantRows, mediaRows] = await Promise.all([
        pool.query(`SELECT id,product_id,attributes,sku,mrp,price,stock,is_active FROM product_variants WHERE product_id=ANY($1::bigint[]) AND is_active=TRUE ORDER BY product_id,id`,[ids]),
        pool.query(`SELECT id,product_id,variant_id,option_key,option_value,media_type,media_url,sort_order,is_card_cover FROM product_media WHERE product_id=ANY($1::bigint[]) AND media_type='image' ORDER BY product_id,sort_order,id`,[ids])
      ]);
      suggestedCards = makeStorefrontCards(resultProducts, variantRows.rows, mediaRows.rows).slice(0,6);
    }
    return res.json({
      products: suggestedCards,
      categories: categoryResult.rows.map(r => ({ id: String(r.id), name: r.name, slug: r.slug }))
    });
  } catch (error) {
    if (error.message === "INVALID_PUBLIC_QUERY") return res.status(400).json({ message: "Invalid search query." });
    console.error("Product suggestions:", error);
    return res.status(500).json({ message: "Search suggestions unavailable." });
  }
}
