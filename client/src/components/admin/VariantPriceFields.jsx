import { FormField, TextField } from "../ui/index";
import { discountFromPrices } from "./variantPricing";
export default function VariantPriceFields({row,onFieldChange,disabled=false}){
 const discount=row.pricingMode==="discount"?row.discount:discountFromPrices(row.mrp??row.price,row.price);
 return <div className="admin-form-grid three-column">
  <FormField><span className="nx34-field-label">MRP (₹) <b className="nx34-required" aria-hidden="true">*</b></span><TextField type="number" min="0.01" step="0.01" disabled={disabled} value={row.mrp??row.price??""} onChange={e=>onFieldChange("mrp",e.target.value)} required/></FormField>
  <FormField><span className="nx34-field-label">Selling price (₹) <b className="nx34-required" aria-hidden="true">*</b></span><TextField type="number" min="0.01" step="0.01" disabled={disabled} value={row.price??""} onChange={e=>onFieldChange("price",e.target.value)} required/></FormField>
  <FormField>Discount (%)<TextField type="number" min="0" max="99.99" step="0.01" disabled={disabled} value={discount??""} onChange={e=>onFieldChange("discount",e.target.value)} aria-label="Discount percentage"/></FormField>
 </div>;
}
