import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/pages/admin/AdminCategories.jsx", import.meta.url), "utf8");

test("Category creation does not invoke native reset on a non-form element", () => {
  assert.doesNotMatch(source, /formRef\.current\?\.reset\(/);
  assert.doesNotMatch(source, /ref=\{formRef\}/);
  assert.doesNotMatch(source, /\buseRef\b/);
});

test("Category modal still clears controlled fields after successful create/update", () => {
  for (const state of ['setName("")', "setImage(null)", "setMenuIcon(null)", "setRemoveMenuIcon(false)", 'setParentId("")', "setEditing(null)", "setModalOpen(false)"]) {
    assert.ok(source.includes(state), `resetForm must contain ${state}`);
  }
  assert.match(source, /setMessage\(data\.message\);\s*resetForm\(\)/);
  assert.match(source, /<form className="admin-form" onSubmit=\{saveCategory\}>/);
});
