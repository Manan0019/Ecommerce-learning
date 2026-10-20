import test from "node:test";
import assert from "node:assert/strict";
import {parseBannerVisualMode} from "../services/bannerVisualMode.js";

test("older promotions keep text overlay by default", () => {
  assert.equal(parseBannerVisualMode(undefined), true);
  assert.equal(parseBannerVisualMode("true"), true);
});
test("image-only promotions accept FormData false", () => {
  assert.equal(parseBannerVisualMode("false"), false);
  assert.equal(parseBannerVisualMode(false), false);
});
test("invalid banner visual mode is rejected", () => {
  for (const value of ["", "0", 0, 1, "yes", null]) assert.equal(parseBannerVisualMode(value), null);
});
