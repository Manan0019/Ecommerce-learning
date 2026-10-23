import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../src/styles/site.css", import.meta.url), "utf8");
const legacy = readFileSync(new URL("../src/styles/site.css", import.meta.url), "utf8");
const markup = readFileSync(new URL("../src/components/customer/PriceRangeSlider.jsx", import.meta.url), "utf8");
test("new price filter uses an explicit single-column root in the legacy cascade", () => {
  assert.match(legacy, /\.price-filter\s*>\s*div\s*\{/);
  assert.match(css, /fieldset\.price-filter\s*>\s*div\.nx30-price-filter\.nx32-price-filter\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/s);
});
test("manual fields, accessible errors and pointer slider live in the same component", () => {
  assert.match(markup, /inputMode="numeric"/);
  assert.match(markup, /setTypedPrice\(handle, event\.target\.value\)/);
  assert.match(markup, /aria-invalid/);
  assert.match(markup, /onPointerMove=\{onPointerMove\}/);
  assert.match(markup, /role="slider"/);
});
test("signup/login branding and small-screen layout rules are present", () => {
  assert.match(css, /\.auth-shell\.nx32-auth-shell/);
  assert.match(css, /@media\s*\(max-width:600px\)/);
  assert.match(css, /\.nx32-auth-shell\s+\.auth-submit/);
});
