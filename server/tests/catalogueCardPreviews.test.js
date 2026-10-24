import assert from "node:assert/strict";
import { test } from "node:test";
import { attachCardPreviews } from "../services/catalogueCardPreviews.js";

const media = [
  { id: 1, product_id: 7, media_type: "image", media_url: "/shared.webp", sort_order: 2, variant_id: null, option_key: null },
  { id: 2, product_id: 7, media_type: "image", media_url: "/black.webp", sort_order: 1, variant_id: null, option_key: "Color", option_value: "Black" },
  { id: 3, product_id: 7, media_type: "image", media_url: "/white.webp", sort_order: 1, variant_id: null, option_key: "Colour", option_value: "White" },
  { id: 4, product_id: 7, media_type: "image", media_url: "/sku-22.webp", sort_order: 3, variant_id: "22" },
  { id: 5, product_id: 7, media_type: "image", media_url: "/sku-33.webp", sort_order: 3, variant_id: "33" },
  { id: 6, product_id: 7, media_type: "video", media_url: "/test.mp4", sort_order: 4 },
  { id: 7, product_id: 8, media_type: "image", media_url: "/other.webp", sort_order: 2 },
  { id: 8, product_id: 7, media_type: "image", media_url: "/size-m.webp", sort_order: 5, option_key: "Size", option_value: "M" },
];

test("SKU card gallery includes shared, exact SKU and matching option images but excludes other variants", () => {
  const [card] = attachCardPreviews([{ id: "7", imageUrl: "/black.webp", selectedVariantId: "22", selectedAttributes: { Color: "Black", Size: "M" } }], media);
  assert.deepEqual(card.previewImages, ["/black.webp", "/shared.webp", "/sku-22.webp", "/size-m.webp"]);
  assert.equal(card.previewImages.includes("/white.webp"), false);
  assert.equal(card.previewImages.includes("/sku-33.webp"), false);
});
test("Parent cards display their selected cover and shared media only", () => {
  const [card] = attachCardPreviews([{ id: "7", imageUrl: "/parent-cover.webp" }], media);
  assert.deepEqual(card.previewImages, ["/parent-cover.webp", "/shared.webp"]);
});
test("Color cards do not borrow an image from an unrelated color", () => {
  const [card] = attachCardPreviews([{ id: "7", colorLabel: "White", selectedVariantId: "33", imageUrl: "/white.webp" }], media);
  assert.deepEqual(card.previewImages, ["/white.webp", "/shared.webp", "/sku-33.webp"]);
});
test("Preview images are unique and bounded to six", () => {
  const six = Array.from({ length: 10 }, (_, index) => ({ id: 30 + index, product_id: 9, media_type: "image", media_url: `/i${index}.webp`, sort_order: index }));
  const [card] = attachCardPreviews([{ id: "9", imageUrl: "/i0.webp" }], six);
  assert.equal(card.previewImages.length, 6);
  assert.equal(new Set(card.previewImages).size, 6);
});
test("Safe fallback when a product has no images", () => {
  const [card] = attachCardPreviews([{ id: "6", imageUrl: null }], media);
  assert.deepEqual(card.previewImages, []);
});

test("Exactly two shared images produce a two-frame product preview", () => {
  const images = [
    { id: 1, product_id: 17, media_type: "image", media_url: "/first.webp", sort_order: 0 },
    { id: 2, product_id: 17, media_type: "image", media_url: "/second.webp", sort_order: 1 },
  ];
  const [card] = attachCardPreviews([{ id: "17", imageUrl: "/first.webp" }], images);
  assert.deepEqual(card.previewImages, ["/first.webp", "/second.webp"]);
});

test("Exactly two selected-variant images never leak an unrelated colour image", () => {
  const images = [
    { id: 1, product_id: 18, media_type: "image", media_url: "/red-1.webp", variant_id: 3, sort_order: 0 },
    { id: 2, product_id: 18, media_type: "image", media_url: "/red-2.webp", variant_id: 3, sort_order: 1 },
    { id: 3, product_id: 18, media_type: "image", media_url: "/blue.webp", variant_id: 4, sort_order: 2 },
  ];
  const [card] = attachCardPreviews([{ id: "18", imageUrl: "/red-1.webp", selectedVariantId: "3" }], images);
  assert.deepEqual(card.previewImages, ["/red-1.webp", "/red-2.webp"]);
});
