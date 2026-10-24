import { Button, Card, Checkbox, EntitySubtitle, FormField, IconButton, TextField, Textarea } from "../ui/index";
import { useEffect, useState } from "react";
import UiIcon from "../common/UiIcon";
import Modal from "../common/Modal";
import { createVariant, getVariants, updateVariant } from "../../services/variantService";
import { validateVariantDrafts } from "./variantDraftValidation";
import { updatePricingDraft, discountFromPrices } from "./variantPricing";
import DraftVariants from "./DraftVariants";
import VariantPriceFields from "./VariantPriceFields";

const newForm = () => ({ sku: "", customTitle: "", attributesText: "", mrp: "", price: "", stock: "0", lowStockThreshold:"5", isActive: true, pricingMode: "price" });
const money = value => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
function parseAttributes(text) {
  const attrs = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon < 1) throw new Error("Enter one option per line as Option: Value.");
    const key = line.slice(0, colon).trim().toLowerCase().replace(/\s+/g, "_");
    const value = line.slice(colon + 1).trim();
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key) || !value || key in attrs) throw new Error("Invalid or repeated option value.");
    attrs[key] = value;
  }
  return attrs;
}

export default function ProductVariantsManager({ productId }) {
  const [variants, setVariants] = useState([]);
  const [form, setForm] = useState(newForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() { const result = await getVariants(productId, true); setVariants(result.variants || []); }
  useEffect(() => {
    let active = true;
    getVariants(productId, true).then(d => { if (active) setVariants(d.variants || []); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [productId]);

  function beginEdit(variant) {
    setEditing(variant.id);
    setForm({ sku: variant.sku, customTitle: variant.customTitle || "", price: String(variant.price), mrp: String(variant.mrp ?? variant.price),
      discount: discountFromPrices(String(variant.mrp ?? variant.price), String(variant.price)),
      pricingMode: "price", stock: String(variant.stock), lowStockThreshold:String(variant.lowStockThreshold ?? 5), isActive: variant.isActive,
      attributesText: Object.entries(variant.attributes || {}).map(([key,value]) => `${key}: ${value}`).join("\n") });
    setError(""); setModalOpen(true);
  }
  function beginAdd() { setEditing(null); setForm(newForm()); setError(""); setModalOpen(true); }

  async function saveOne(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const attributes = parseAttributes(form.attributesText);
      const data = validateVariantDrafts([{ ...form, key: "edited", attributes }])[0];
      const body = { sku: data.sku, customTitle: data.customTitle || "", attributes: data.attributes, mrp: data.mrp, price: data.price, stock: Number(data.stock), lowStockThreshold:Number(data.lowStockThreshold ?? 5), isActive: data.isActive };
      if (editing) await updateVariant(productId, editing, body);
      else await createVariant(productId, body);
      await refresh(); setModalOpen(false); setEditing(null); setForm(newForm());
      setMessage("SKU saved successfully.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function saveDrafts() {
    setError(""); setMessage(""); let checked;
    try { checked = validateVariantDrafts(drafts); } catch (err) { setError(err.message); return; }
    setBusy(true);
    const failed = [];
    for (const row of checked) {
      try { await createVariant(productId, { sku: row.sku, customTitle: row.customTitle || "", attributes: row.attributes, mrp: row.mrp, price: row.price, stock: Number(row.stock), lowStockThreshold:Number(row.lowStockThreshold ?? 5), isActive: row.isActive }); }
      catch (err) { failed.push({ ...row, error: err.message }); }
    }
    setDrafts(failed);
    try { await refresh(); } catch (err) { setError(err.message); }
    setMessage(failed.length ? `${checked.length - failed.length} saved, ${failed.length} failed. Review the remaining drafts.` : `${checked.length} SKU(s) created successfully.`);
    setBusy(false);
  }

  return <Card as="section" className="admin-panel nx-variant-panel">
    <div className="admin-panel-heading"><div><h2>SKUs & inventory</h2><p>Each configuration has independent pricing and stock.</p></div>
      <Button variant="primary" type="button"  onClick={beginAdd}>+ Add a SKU</Button></div>
    {message && <p role="status" className="admin-form-message">{message}</p>}
    {error && !modalOpen && <p role="alert" className="admin-alert">{error}</p>}
    {variants.length === 0 ? <div className="admin-empty">No saved SKUs yet. Add one manually or generate a collection below.</div> :
      <div className="nx-sku-list">
        <div className="nx-sku-head"><span>Configuration</span><span>Pricing</span><span>Inventory</span><span></span></div>
        {variants.map(v => <div className="nx-sku-row" key={v.id}>
          <div><strong>{v.customTitle || v.sku}</strong><EntitySubtitle>{v.customTitle ? `SKU: ${v.sku} · ` : ""}{Object.entries(v.attributes || {}).map(([k,value]) => `${k.replaceAll("_", " ")}: ${value}`).join(" · ") || "Default configuration"}</EntitySubtitle></div>
          <div><strong>{money(v.price)}</strong><small>MRP {money(v.mrp ?? v.price)}</small></div>
          <div><strong>{v.stock} units</strong><small>{v.isActive ? (Number(v.stock) <= Number(v.lowStockThreshold ?? 5) ? `Low stock (≤ ${v.lowStockThreshold ?? 5})` : "Active") : "Inactive"}</small></div>
          <IconButton variant="secondary"  type="button" title="Edit SKU" aria-label={`Edit SKU ${v.sku}`} onClick={() => beginEdit(v)}><UiIcon name="edit" size={18}/></IconButton>
        </div>)}
      </div>}
    <details className="nx-generator-details"><summary><span><strong>Generate multiple SKU combinations</strong><small>Colors × sizes × storage, and any other option groups</small></span><span>Expand <UiIcon name="chevron-down" size={17}/></span></summary>
      <DraftVariants variants={drafts} onChange={setDrafts} disabled={busy} existingVariants={variants} />
      {drafts.length > 0 && <Button variant="primary" type="button"  disabled={busy} onClick={saveDrafts}>{busy ? "Saving…" : `Save ${drafts.length} generated SKU(s)`}</Button>}
    </details>
    {modalOpen && <Modal title={editing ? "Edit SKU" : "Add a SKU"} subtitle="Change this configuration without scrolling through other variants." size="medium"
      onClose={() => { if (!busy) { setModalOpen(false); setError(""); } }} closeDisabled={busy}>
      <form className="admin-form nx-sku-form" onSubmit={saveOne}>
        <div className="admin-form-grid two-column"><FormField><span className="nx34-field-label">SKU <b className="nx34-required" aria-hidden="true">*</b></span><TextField required maxLength={80} value={form.sku} onChange={e => setForm(old => ({ ...old, sku: e.target.value }))}/></FormField>
          <FormField><span className="nx34-field-label">Stock units <b className="nx34-required" aria-hidden="true">*</b></span><TextField type="number" min="0" step="1" required value={form.stock} onChange={e => setForm(old => ({ ...old, stock: e.target.value }))}/></FormField>
          <FormField><span className="nx34-field-label">Low-stock alert at or below <b className="nx34-required" aria-hidden="true">*</b></span><TextField type="number" min="0" max="1000000" step="1" required value={form.lowStockThreshold} onChange={e => setForm(old => ({ ...old, lowStockThreshold: e.target.value }))}/></FormField></div>
        <FormField>Customer-facing variant title (optional)<TextField maxLength={260} value={form.customTitle || ""} placeholder="MacBook Air M5 · 24 GB RAM / 512 GB SSD" onChange={e => setForm(old => ({...old, customTitle: e.target.value}))}/></FormField>
        <VariantPriceFields row={form} disabled={busy} onFieldChange={(field,value) => setForm(old => updatePricingDraft(old, field, value))}/>
        <FormField>Option values <small>One per line, like Color: Midnight</small><Textarea rows={4} value={form.attributesText} onChange={e => setForm(old => ({ ...old, attributesText: e.target.value }))} placeholder={"Color: Midnight\nRAM: 16 GB\nStorage: 1 TB"}/></FormField>
        <FormField inline className="nx-inline-checkbox"><Checkbox type="checkbox" checked={form.isActive} onChange={e => setForm(old => ({ ...old, isActive: e.target.checked }))}/> SKU active for customers</FormField>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        <div className="nx-sticky-actions"><Button variant="primary"  type="submit" disabled={busy}>{busy ? "Saving…" : "Save SKU"}</Button>
          <Button variant="secondary" type="button"  disabled={busy} onClick={() => setModalOpen(false)}>Cancel</Button></div>
      </form>
    </Modal>}
  </Card>;
}
