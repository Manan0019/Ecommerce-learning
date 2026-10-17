import { useState } from "react";

const blank = () => ({
  key: crypto.randomUUID(),
  sku: "",
  attributesText: "",
  price: "",
  stock: "0",
  isActive: true,
});

import { validateVariantDrafts } from "./variantDraftValidation";

export default function DraftVariants({
  variants,
  onChange,
  disabled = false,
}) {
  const [error, setError] = useState("");

  function update(key, field, value) {
    onChange((all) =>
      all.map((v) => (v.key === key ? { ...v, [field]: value } : v)),
    );
  }

  // Validate draft data prior to submitting the parent product.
  // This component is reused independently from backend persistence.
  function updateAndValidate(next) {
    onChange(next);
    setError("");
  }

  return (
    <section className="admin-panel" aria-label="Product variants draft">
      <h2>SKUs &amp; Product Variants</h2>
      <p>
        Optional for a simple product. Add one row per purchasable size, color,
        storage, or other configuration. Each row has its own SKU, price, and
        stock.
      </p>
      <button
        type="button"
        disabled={disabled || variants.length >= 30}
        onClick={() => updateAndValidate([...variants, blank()])}
      >
        + Add variant
      </button>
      {variants.map((row, index) => (
        <fieldset
          key={row.key}
          disabled={disabled}
          className="admin-panel"
          style={{ marginTop: 12 }}
        >
          <legend>Variant {index + 1}</legend>
          <div className="admin-form-grid two-column">
            <label>
              SKU
              <input
                value={row.sku}
                onChange={(e) => update(row.key, "sku", e.target.value)}
                placeholder="SHIRT-BLACK-M"
                required
                maxLength={80}
              />
            </label>
            <label>
              Price (₹)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={row.price}
                onChange={(e) => update(row.key, "price", e.target.value)}
                required
              />
            </label>
            <label>
              Stock
              <input
                type="number"
                min="0"
                step="1"
                value={row.stock}
                onChange={(e) => update(row.key, "stock", e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            Attributes — one per line: e.g. Color: Black, Size: M
            <textarea
              value={row.attributesText}
              onChange={(e) =>
                update(row.key, "attributesText", e.target.value)
              }
              placeholder={"Color: Black\nSize: M"}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={row.isActive}
              onChange={(e) => update(row.key, "isActive", e.target.checked)}
            />{" "}
            Active
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              updateAndValidate(variants.filter((v) => v.key !== row.key))
            }
          >
            Remove variant
          </button>
        </fieldset>
      ))}
      {variants.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            try {
              const normalized = validateVariantDrafts(variants);
              onChange(normalized);
              setError("");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Check variant entries
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
