import { useState } from "react";
import Modal from "../common/Modal";
import { validateVariantDrafts } from "./variantDraftValidation";
import { generateVariantMatrix, newOptionGroup } from "./variantGenerator";
import { updatePricingDraft } from "./variantPricing";
import VariantPriceFields from "./VariantPriceFields";

const blank = () => ({ key: crypto.randomUUID(), sku: "", customTitle: "", attributesText: "", mrp: "", price: "", stock: "0", lowStockThreshold:"5", isActive: true, pricingMode: "price" });
export default function DraftVariants({ variants, onChange, disabled = false, existingVariants = [] }) {
  const [groups, setGroups] = useState(() => [{ ...newOptionGroup(), name: "Color" }, { ...newOptionGroup(), name: "Size" }]);
  const [skuPrefix, setSkuPrefix] = useState("ITEM");
  const [defaultMrp, setDefaultMrp] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultStock, setDefaultStock] = useState("0");
  const [editingKey, setEditingKey] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const current = variants.find(row => row.key === editingKey);

  function change(next) { onChange(next); setError(""); setFeedback(""); }
  function update(key, field, value) {
    change(variants.map(row => row.key !== key ? row : ["mrp", "price", "discount"].includes(field)
      ? updatePricingDraft(row, field, value) : { ...row, [field]: value }));
  }
  function generate() {
    try {
      const additions = generateVariantMatrix({ groups: groups.filter(group => group.name.trim() || group.values.trim()),
        skuPrefix, defaultMrp, defaultPrice, defaultStock, existing: [...variants, ...existingVariants], limit: 120 });
      if (additions.length) onChange([...variants, ...additions]);
      setFeedback(additions.length ? `${additions.length} new SKU drafts ready. Review before saving.` : "All generated combinations already exist.");
      setError("");
    } catch (err) { setError(err.message); setFeedback(""); }
  }
  function validate() {
    try { validateVariantDrafts(variants); setFeedback("All SKU drafts pass local validation."); setError(""); }
    catch (err) { setError(err.message); setFeedback(""); }
  }
  return <section className="admin-panel nx-draft-variants" aria-label="SKU variant generator">
    <div className="admin-panel-heading"><div><h2>SKU combinations</h2><p>Define as many option dimensions as needed. Use Edit on a draft to change its price or stock in a popup.</p></div>
      <span className="nx-draft-count">{variants.length} / 120 drafts</span></div>
    <fieldset disabled={disabled} className="nx-matrix-fieldset"><legend>Build combinations</legend>
      {groups.map((group, index) => <div className="nx-matrix-group" key={group.id}>
        <label>Option {index + 1}<input value={group.name} maxLength={40} onChange={e => setGroups(old => old.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))} placeholder="Color" /></label>
        <label>Values, separated by commas<input value={group.values} onChange={e => setGroups(old => old.map(g => g.id === group.id ? { ...g, values: e.target.value } : g))} placeholder="Black, White, Blue" /></label>
        <button type="button" className="nx-text-action" disabled={groups.length === 1} onClick={() => setGroups(old => old.filter(g => g.id !== group.id))}>Remove</button>
      </div>)}
      <button className="admin-secondary-action" type="button" disabled={groups.length >= 8} onClick={() => setGroups(old => [...old, newOptionGroup()])}>+ Add another option group</button>
      <div className="admin-form-grid two-column nx-generator-inputs">
        <label>SKU prefix<input value={skuPrefix} onChange={e => setSkuPrefix(e.target.value)} /></label>
        <label>Default stock per SKU<input type="number" min="0" step="1" value={defaultStock} onChange={e => setDefaultStock(e.target.value)} /></label>
        <label>Default MRP (₹)<input type="number" min="0.01" step="0.01" value={defaultMrp} onChange={e => setDefaultMrp(e.target.value)} /></label>
        <label>Default selling price (₹)<input type="number" min="0.01" step="0.01" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} /></label>
      </div>
      <div className="nx-generator-footer"><button type="button" className="admin-primary-action" disabled={disabled || variants.length >= 120} onClick={generate}>Generate combinations</button>
        <span>Maximum 8 option groups, up to 120 drafts.</span></div>
    </fieldset>
    <div className="nx-draft-toolbar"><strong>Generated drafts ({variants.length})</strong>
      <button type="button" className="admin-secondary-action" disabled={disabled || variants.length >= 120} onClick={() => { const row = blank(); change([...variants, row]); setEditingKey(row.key); }}>+ Manual SKU</button></div>
    {variants.length > 0 && <div className="nx-draft-table-wrap"><table className="admin-table">
      <thead><tr><th>SKU / options</th><th>Selling price</th><th>Stock</th><th>Edit</th></tr></thead>
      <tbody>{variants.map(row => <tr key={row.key}>
        <td><strong>{row.sku || "New SKU"}</strong><br/><small>{row.attributesText?.replaceAll("\n", " · ") || "Enter option values"}</small></td>
        <td>₹{row.price || "—"}</td><td>{row.stock || "0"}</td>
        <td><div className="nx-actions"><button type="button" className="nx-edit-button" onClick={() => setEditingKey(row.key)} disabled={disabled}>Edit</button>
          <button type="button" className="admin-danger-action" onClick={() => change(variants.filter(v => v.key !== row.key))} disabled={disabled}>Remove</button></div></td>
      </tr>)}</tbody></table></div>}
    {variants.length > 0 && <button type="button" className="admin-secondary-action" disabled={disabled} onClick={validate}>Validate all SKU drafts</button>}
    {feedback && <p role="status" className="admin-form-message">{feedback}</p>}
    {error && <p role="alert" className="admin-alert">{error}</p>}
    {current && <Modal title={`Edit draft · ${current.sku || "New SKU"}`} subtitle="Edit the draft here; it will be saved to PostgreSQL only when you create/save the product." size="medium"
      onClose={() => setEditingKey(null)}>
      <div className="admin-form nx-sku-form">
        <div className="admin-form-grid two-column"><label>SKU<input value={current.sku} maxLength={80} onChange={e => update(current.key, "sku", e.target.value)} /></label>
          <label>Stock<input type="number" min="0" step="1" value={current.stock} onChange={e => update(current.key, "stock", e.target.value)} /></label>
          <label>Low-stock alert at or below<input type="number" min="0" max="1000000" step="1" value={current.lowStockThreshold ?? "5"} onChange={e => update(current.key, "lowStockThreshold", e.target.value)} /></label></div>
        <label>Customer-facing variant title (optional)<input maxLength={260} value={current.customTitle || ""} onChange={e => update(current.key,"customTitle",e.target.value)} placeholder="MacBook Air M5 · 16 GB / 1 TB"/></label>
        <VariantPriceFields row={current} onFieldChange={(field,value) => update(current.key, field, value)} />
        <label>Options (one per line)<textarea rows={4} value={current.attributesText || ""} onChange={e => update(current.key, "attributesText", e.target.value)} placeholder={"Color: Midnight\nRAM: 16 GB\nStorage: 1 TB"}/></label>
        <label className="nx-inline-checkbox"><input type="checkbox" checked={current.isActive} onChange={e => update(current.key, "isActive", e.target.checked)}/> Active SKU</label>
        <div className="nx-sticky-actions"><button className="admin-primary-action" type="button" onClick={() => setEditingKey(null)}>Done editing</button></div>
      </div>
    </Modal>}
  </section>;
}
