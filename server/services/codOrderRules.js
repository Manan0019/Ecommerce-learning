import {canonicalIndianState} from './indianStates.js';
import { isPositiveId, toPaise } from "./cartPricing.js";

export const ORDER_STATES = Object.freeze(["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
const TRANSITIONS = Object.freeze({ placed: ["confirmed", "cancelled"], confirmed: ["processing", "cancelled"], processing: ["shipped"], shipped: ["delivered"], delivered: [], cancelled: [] });
export function canChangeOrderStatus(from, to) { return TRANSITIONS[from]?.includes(to) ?? false; }
export function validRequestKey(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function validateAddress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Delivery address is required.";
  const fields = { fullName: [2, 100], phone: [10, 15], addressLine1: [5, 200], city: [2, 100], state: [2, 100], pincode: [6, 6] };
  for (const [field, [min, max]] of Object.entries(fields)) {
    if (typeof value[field] !== "string" || value[field].trim().length < min || value[field].trim().length > max) return `Invalid delivery address: ${field}.`;
  }
  if (!canonicalIndianState(value.state)) return "Choose a valid Indian state or union territory.";
  if (!/^[0-9]{6}$/.test(value.pincode.trim())) return "Enter a valid 6-digit Indian PIN code.";
  if (!/^\+?[0-9\s-]{10,18}$/.test(value.phone.trim()) || value.phone.replace(/\D/g, "").length < 10) return "Enter a valid mobile number.";
  if (value.addressLine2 != null && (typeof value.addressLine2 !== "string" || value.addressLine2.length > 200)) return "Invalid address line 2.";
  return null;
}
export function normalizeAddress(value) {
  return Object.fromEntries(["fullName", "phone", "addressLine1", "addressLine2", "city", "state", "pincode"].map(k => [k, k === 'state' ? (canonicalIndianState(value[k]) || String(value[k] ?? '').trim()) : String(value[k] ?? '').trim()]));
}
export function makeOrderLine(item, product, variant, configured) {
  if (!product || !product.is_active || !product.category_active) return { error: "Product is unavailable." };
  if (configured && !variant) return { error: "Please select a valid SKU for every product." };
  if (item.variantId && (!variant || String(variant.product_id) !== item.productId)) return { error: "A selected SKU is invalid." };
  if (variant && !variant.is_active) return { error: "A selected SKU is inactive." };
  const stock = Number(variant ? variant.stock : product.stock);
  if (!Number.isSafeInteger(stock) || stock < item.quantity) return { error: "Insufficient stock for one or more items." };
  const unitPaise = toPaise(variant ? variant.price : product.price);
  if (unitPaise <= 0n) return { error: "Invalid product price." };
  return { productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity,
    name: product.name, sku: variant?.sku ?? null, attributes: variant?.attributes ?? {}, imageUrl: product.image_url,
    unitPrice: unitPaise, lineTotal: unitPaise * BigInt(item.quantity) };
}
export function validOrderId(id) { return isPositiveId(String(id)); }

// Courier details describe a manual dispatch entry. They are not courier-verified tracking.
export function validateDispatch(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Delivery partner is required.";
  const partner = typeof value.deliveryPartner === "string" ? value.deliveryPartner.trim() : "";
  if (value.trackingReference != null && typeof value.trackingReference !== "string") return "Tracking reference must be text.";
  const reference = typeof value.trackingReference === "string" ? value.trackingReference.trim() : "";
  if (partner.length < 2 || partner.length > 80) return "Delivery partner must be between 2 and 80 characters.";
  if (reference.length > 100 || (reference && !/^[\p{L}\p{N} _./#-]+$/u.test(reference))) return "Enter a valid tracking reference (up to 100 characters).";
  return null;
}
export function canConfirmCodCollection(status, paymentStatus) {
  return status === "delivered" && paymentStatus === "cod_pending";
}
