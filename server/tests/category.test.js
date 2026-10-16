import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categorySlugBase,
  createUniqueCategorySlug,
  normalizeCategoryName
} from "../services/categoryService.js";
import { saveCatalogImage } from "../services/catalogImageService.js";

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
