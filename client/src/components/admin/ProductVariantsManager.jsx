import { useEffect, useState } from "react";
import {
  createVariant,
  getVariants,
  updateVariant,
} from "../../services/variantService";
const empty = {
  sku: "",
  attributesText: "Color: Black",
  price: "",
  stock: "0",
  isActive: true,
};
export default function ProductVariantsManager({ productId }) {
  const [variants, setVariants] = useState([]),
    [form, setForm] = useState(empty),
    [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    const result = await getVariants(productId, true);
    setVariants(result.variants);
  }
  useEffect(() => {
    let active = true;
    getVariants(productId, true)
      .then((data) => {
        if (active) setVariants(data.variants);
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [productId]);
  function edit(v) {
    setEditing(v.id);
    setForm({
      sku: v.sku,
      price: v.price,
      stock: String(v.stock),
      isActive: v.isActive,
      attributesText: Object.entries(v.attributes)
        .map(([k, value]) => `${k}: ${value}`)
        .join("\n"),
    });
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const attributes = {};
      for (const line of form.attributesText.split("\n")) {
        if (!line.trim()) continue;
        const split = line.indexOf(":");
        if (split < 1) throw Error("Each attribute needs Key: Value");
        const key = line
          .slice(0, split)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");
        const value = line.slice(split + 1).trim();
        if (!value) throw Error("Attribute value is required");
        attributes[key] = value;
      }
      const body = {
        sku: form.sku.trim(),
        attributes,
        price: String(form.price),
        stock: Number(form.stock),
        isActive: form.isActive,
      };
      if (editing) await updateVariant(productId, editing, body);
      else await createVariant(productId, body);
      await refresh();
      setForm(empty);
      setEditing(null);
      setMessage("Variant saved.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Product variants</h2>
        <p>
          Each combination has its own SKU, price and stock. Example: Size: XL
          or Color: Blue.
        </p>
      </div>
      <div>
        {variants.map((v) => (
          <div
            key={v.id}
            style={{ padding: "10px", borderBottom: "1px solid #ddd" }}
          >
            <strong>{v.sku}</strong> —{" "}
            {Object.entries(v.attributes)
              .map(([k, value]) => `${k}: ${value}`)
              .join(" · ")}{" "}
            — ₹{v.price} — Stock {v.stock} —{" "}
            {v.isActive ? "Active" : "Inactive"}
            <button
              type="button"
              onClick={() => edit(v)}
              style={{ marginLeft: 12 }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      <form className="admin-form" onSubmit={save}>
        <label>
          SKU
          <input
            required
            value={form.sku}
            onChange={(e) => setForm((v) => ({ ...v, sku: e.target.value }))}
          />
        </label>
        <label>
          Attributes (one per line, e.g. Size: XL)
          <textarea
            required
            value={form.attributesText}
            onChange={(e) =>
              setForm((v) => ({ ...v, attributesText: e.target.value }))
            }
          />
        </label>
        <label>
          Price (₹)
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.price}
            onChange={(e) => setForm((v) => ({ ...v, price: e.target.value }))}
          />
        </label>
        <label>
          Stock
          <input
            type="number"
            min="0"
            step="1"
            required
            value={form.stock}
            onChange={(e) => setForm((v) => ({ ...v, stock: e.target.value }))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm((v) => ({ ...v, isActive: e.target.checked }))
            }
          />{" "}
          Active
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : editing ? "Update variant" : "Add variant"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(empty);
            }}
          >
            Cancel edit
          </button>
        )}
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
