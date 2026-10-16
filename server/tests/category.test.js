import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categorySlugBase,
  createUniqueCategorySlug,
  normalizeCategoryName
} from "../services/categoryService.js";
import { saveCatalogImage } from "../services/catalogImageService.js";
import {
  buildSpecificationFacets,
  validateSpecifications
} from "../services/productSpecificationService.js";

test("category names are normalized without losing capitalization", () => {
  assert.equal(normalizeCategoryName("  Home   Decor  "), "Home Decor");
  assert.equal(normalizeCategoryName("x"), null);
  assert.equal(normalizeCategoryName(" ".repeat(10)), null);
});

test("category slugs are URL safe and duplicate candidates receive a suffix", async () => {
  assert.equal(categorySlugBase("Café & Dining"), "cafe-dining");
  const attempts = [];
  const database = {
    async query(_sql, values) {
      attempts.push(values);
      return { rows: values[0] === "home-decor" ? [{ exists: true }] : [] };
    }
  };
  assert.equal(await createUniqueCategorySlug(database, "Home Decor"), "home-decor-2");
  assert.deepEqual(attempts.map(([slug]) => slug), ["home-decor", "home-decor-2"]);
});

test("catalog images reject content that is not a decodable image", async () => {
  await assert.rejects(
    saveCatalogImage({ buffer: Buffer.from("not-an-image") }, "categories"),
    /INVALID_IMAGE/
  );
});

test("electronics specifications are category-specific and typed", () => {
  const category = { name: "Smartphones", slug: "electronics-smartphones" };
  const result = validateSpecifications(category, {
    chipset: "Snapdragon 8 Elite",
    ramGb: "12",
    storageGb: ["256", "512"],
    os: "Android",
    features: ["NFC", "eSIM"]
  });
  assert.equal(result.definition.type, "smartphone");
  assert.equal(result.specifications.ramGb, 12);
  assert.deepEqual(result.specifications.storageGb, ["256", "512"]);
  assert.throws(() => validateSpecifications(category, { unknownKey: "value" }), /INVALID_SPECIFICATIONS/);
  assert.throws(() => validateSpecifications(category, { os: "Windows" }), /INVALID_SPECIFICATIONS/);
});

test("filter facets only use validated definitions and existing product values", () => {
  const category = { name: "Laptops", slug: "electronics-laptops" };
  const { facets } = buildSpecificationFacets(category, [
    { brand: "Framework", specifications: { ramGb: 16, os: "Linux", features: ["Wi-Fi 6E"] } },
    { brand: "Framework", specifications: { ramGb: 32, os: "Linux" } }
  ]);
  assert.deepEqual(facets.find((facet) => facet.key === "brand").options, [
    { value: "Framework", label: "Framework", count: 2 }
  ]);
  assert.deepEqual(facets.find((facet) => facet.key === "ramGb").options.map((item) => item.value), ["16", "32"]);
  assert.equal(facets.some((facet) => facet.key === "unknownKey"), false);
});
