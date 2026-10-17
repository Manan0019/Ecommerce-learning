import { useState } from "react";
import { validateVariantDrafts } from "./variantDraftValidation";
import { buildVariantDrafts } from "./variantGenerator";

const blank = () => ({
  key: crypto.randomUUID(),
  sku: "",
  attributesText: "",
  price: "",
  stock: "0",
  isActive: true,
});

export default function DraftVariants({
  variants,
  onChange,
  disabled = false,
}) {
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [nameA, setNameA] = useState("Color");
  const [valuesA, setValuesA] = useState("");
  const [nameB, setNameB] = useState("Size");
  const [valuesB, setValuesB] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("ITEM");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultStock, setDefaultStock] = useState("0");

  function change(next) {
    onChange(next);
    setError("");
    setFeedback("");
  }
  function update(key, field, value) {
    change(variants.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  }
  function generate() {
    try {
      const additions = buildVariantDrafts({
        nameA,
        valuesA,
        nameB,
        valuesB,
        skuPrefix,
        defaultPrice,
        defaultStock,
        existing: variants,
        limit: 30,
      });
      if (additions.length) onChange([...variants, ...additions]);
      setFeedback(
        additions.length
          ? `Generated ${additions.length} editable variant(s). Review all SKUs before saving.`
          : "All combinations already exist.",
      );
      setError("");
    } catch (e) {
      setError(e.message);
      setFeedback("");
    }
  }
  return (
    <section className="admin-panel" aria-label="Product variants draft">
      <h2>SKUs &amp; Product Variants</h2>
      <p>
        Optional for simple products. Generate size/color combinations or add
        custom variants manually. Each SKU has its own price and stock.
      </p>
      <fieldset
        disabled={disabled}
        className="admin-panel"
        style={{ marginBottom: 16 }}
      >
        <legend>Generate variant combinations</legend>
        <div className="admin-form-grid two-column">
          <label>
            First attribute
            <input
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="Color"
              maxLength={40}
            />
          </label>
          <label>
            Values (comma-separated)
            <input
              value={valuesA}
              onChange={(e) => setValuesA(e.target.value)}
              placeholder="Black, White, Blue"
            />
          </label>
          <label>
            Second attribute (optional)
            <input
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="Size"
              maxLength={40}
            />
          </label>
          <label>
            Values (optional)
            <input
              value={valuesB}
              onChange={(e) => setValuesB(e.target.value)}
              placeholder="S, M, L"
            />
          </label>
          <label>
            SKU prefix
            <input
              value={skuPrefix}
              onChange={(e) => setSkuPrefix(e.target.value)}
              placeholder="TSHIRT"
              maxLength={40}
            />
          </label>
          <label>
            Default selling price (₹)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
            />
          </label>
          <label>
            Default stock per variant
            <input
              type="number"
              min="0"
              step="1"
              value={defaultStock}
              onChange={(e) => setDefaultStock(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={disabled || variants.length >= 30}
          onClick={generate}
        >
          Generate combinations
        </button>
        <p>
          Maximum 30 variants total. Generated entries can be edited
          individually below.
        </p>
      </fieldset>
      <button
        type="button"
        disabled={disabled || variants.length >= 30}
        onClick={() => change([...variants, blank()])}
      >
        + Add variant manually
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
            Attributes (one per line: Color: Black)
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
            onClick={() => change(variants.filter((v) => v.key !== row.key))}
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
              validateVariantDrafts(variants);
              setError("");
              setFeedback("All SKU entries pass local validation.");
            } catch (e) {
              setError(e.message);
              setFeedback("");
            }
          }}
        >
          Check variant entries
        </button>
      )}
      {feedback && <p role="status">{feedback}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
