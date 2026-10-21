import Modal from "../common/Modal";
import ProductEditorWorkspace from "./ProductEditorWorkspace";

/** Keep the existing product editor and its Details / SKUs / Gallery tabs inside a modal. */
export default function AdminProductEditDialog({ productId, name, initialTab = "details", onClose, onSaved }) {
  if (!productId) return null;
  return <Modal
    title={`Edit · ${name || `Product #${productId}`}`}
    subtitle="Update product details, SKUs or gallery without leaving the page."
    size="large"
    onClose={onClose}
  >
    <ProductEditorWorkspace key={`${productId}-${initialTab}`} productId={productId} initialTab={initialTab} onSaved={onSaved}/>
  </Modal>;
}
