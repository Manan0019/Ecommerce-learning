import { Button, Card, Checkbox, DataTable, FormField, IconButton, TableBody, TableCell, TableHead, TableHeader, TableRow, TextField, Textarea } from "../ui/index";

import { useState } from "react";
import Modal from "../common/Modal";
import UiIcon from "../common/UiIcon";
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
  return <Card as="section" className="admin-panel nx-draft-variants" aria-label="SKU variant generator">
    <div className="admin-panel-heading"><div><h2>SKU combinations</h2><p>Define as many option dimensions as needed. Use Edit on a draft to change its price or stock in a popup.</p></div>
      <span className="nx-draft-count">{variants.length} / 120 drafts</span></div>
    <fieldset disabled={disabled} className="nx-matrix-fieldset"><legend>Build combinations</legend>
      {groups.map((group, index) => <div className="nx-matrix-group" key={group.id}>
        <FormField>Option {index + 1}<TextField value={group.name} maxLength={40} onChange={e => setGroups(old => old.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))} placeholder="Color" /></FormField>
        <FormField>Values, separated by commas<TextField value={group.values} onChange={e => setGroups(old => old.map(g => g.id === group.id ? { ...g, values: e.target.value } : g))} placeholder="Black, White, Blue" /></FormField>
        <IconButton variant="danger" type="button"  aria-label={`Remove ${group.name || `option ${index+1}`}`} title="Remove option group" disabled={groups.length === 1} onClick={() => setGroups(old => old.filter(g => g.id !== group.id))}><UiIcon name="trash" size={18}/><span className="sr-only">Remove option group</span></IconButton>
      </div>)}
      <Button variant="secondary"  type="button" disabled={groups.length >= 8} onClick={() => setGroups(old => [...old, newOptionGroup()])}>+ Add another option group</Button>
      <div className="admin-form-grid two-column nx-generator-inputs">
        <FormField>SKU prefix<TextField value={skuPrefix} onChange={e => setSkuPrefix(e.target.value)} /></FormField>
        <FormField>Default stock per SKU<TextField type="number" min="0" step="1" value={defaultStock} onChange={e => setDefaultStock(e.target.value)} /></FormField>
        <FormField>Default MRP (₹)<TextField type="number" min="0.01" step="0.01" value={defaultMrp} onChange={e => setDefaultMrp(e.target.value)} /></FormField>
        <FormField>Default selling price (₹)<TextField type="number" min="0.01" step="0.01" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} /></FormField>
      </div>
      <div className="nx-generator-footer"><Button variant="primary" type="button"  disabled={disabled || variants.length >= 120} onClick={generate}>Generate combinations</Button>
        <span>Maximum 8 option groups, up to 120 drafts.</span></div>
    </fieldset>
    <div className="nx-draft-toolbar"><strong>Generated drafts ({variants.length})</strong>
      <Button variant="secondary" type="button"  disabled={disabled || variants.length >= 120} onClick={() => { const row = blank(); change([...variants, row]); setEditingKey(row.key); }}>+ Manual SKU</Button></div>
    {variants.length > 0 && <div className="nx-draft-table-wrap"><DataTable className="admin-table">
      <TableHead><TableRow><TableHeader>SKU / options</TableHeader><TableHeader>Selling price</TableHeader><TableHeader align="end">Stock</TableHeader><TableHeader>Edit</TableHeader></TableRow></TableHead>
      <TableBody>{variants.map(row => <TableRow key={row.key}>
        <TableCell><strong>{row.sku || "New SKU"}</strong><br/><small>{row.attributesText?.replaceAll("\n", " · ") || "Enter option values"}</small></TableCell>
        <TableCell>₹{row.price || "—"}</TableCell><TableCell>{row.stock || "0"}</TableCell>
        <TableCell><div className="nx-actions"><IconButton variant="secondary" type="button"  title="Edit SKU" aria-label={`Edit ${row.sku||'SKU'}`} onClick={() => setEditingKey(row.key)} disabled={disabled}><UiIcon name="edit" size={18}/></IconButton>
          <IconButton variant="danger" type="button"  title="Remove SKU draft" aria-label={`Remove ${row.sku||'SKU'}`} onClick={() => change(variants.filter(v => v.key !== row.key))} disabled={disabled}><UiIcon name="trash" size={18}/></IconButton></div></TableCell>
      </TableRow>)}</TableBody></DataTable></div>}
    {variants.length > 0 && <Button variant="secondary" type="button"  disabled={disabled} onClick={validate}>Validate all SKU drafts</Button>}
    {feedback && <p role="status" className="admin-form-message">{feedback}</p>}
    {error && <p role="alert" className="admin-alert">{error}</p>}
    {current && <Modal title={`Edit draft · ${current.sku || "New SKU"}`} subtitle="Edit the draft here; it will be saved to PostgreSQL only when you create/save the product." size="medium"
      onClose={() => setEditingKey(null)}>
      <div className="admin-form nx-sku-form">
        <div className="admin-form-grid two-column"><FormField>SKU<TextField value={current.sku} maxLength={80} onChange={e => update(current.key, "sku", e.target.value)} /></FormField>
          <FormField>Stock<TextField type="number" min="0" step="1" value={current.stock} onChange={e => update(current.key, "stock", e.target.value)} /></FormField>
          <FormField>Low-stock alert at or below<TextField type="number" min="0" max="1000000" step="1" value={current.lowStockThreshold ?? "5"} onChange={e => update(current.key, "lowStockThreshold", e.target.value)} /></FormField></div>
        <FormField>Customer-facing variant title (optional)<TextField maxLength={260} value={current.customTitle || ""} onChange={e => update(current.key,"customTitle",e.target.value)} placeholder="MacBook Air M5 · 16 GB / 1 TB"/></FormField>
        <VariantPriceFields row={current} onFieldChange={(field,value) => update(current.key, field, value)} />
        <FormField>Options (one per line)<Textarea rows={4} value={current.attributesText || ""} onChange={e => update(current.key, "attributesText", e.target.value)} placeholder={"Color: Midnight\nRAM: 16 GB\nStorage: 1 TB"}/></FormField>
        <FormField inline className="nx-inline-checkbox"><Checkbox type="checkbox" checked={current.isActive} onChange={e => update(current.key, "isActive", e.target.checked)}/> Active SKU</FormField>
        <div className="nx-sticky-actions"><Button variant="primary"  type="button" onClick={() => setEditingKey(null)}>Done editing</Button></div>
      </div>
    </Modal>}
  </Card>;
}
