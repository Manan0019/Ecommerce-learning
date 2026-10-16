import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import { getAdminProduct, updateProduct, updateProductImage } from "../../services/productService";
import { useActiveCategories } from "../../hooks/useActiveCategories";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const imageFormRef = useRef(null);
  const { categories, categoriesLoading, categoriesError } = useActiveCategories();
  const [form, setForm] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imageMessage, setImageMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProduct() {
      try {
        const data = await getAdminProduct(id, controller.signal);
        if (controller.signal.aborted) return;
        const product = data.product;
        setForm({ name: product.name, description: product.description, categoryId: product.categoryId,
          price: product.price, stock: String(product.stock) });
        setImageUrl(product.imageUrl);
      } catch (requestError) {
        if (isAuthenticationError(requestError)) {
          navigate("/login", { replace: true });
          return;
        }
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProduct();
    return () => controller.abort();
  }, [id, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function saveDetails(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateProduct(id, { ...form, stock: Number(form.stock) });
      navigate("/admin/products", { replace: true });
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(event) {
    event.preventDefault();
    if (!newImage) {
      setImageMessage("Choose an image first.");
      return;
    }
    const formData = new FormData();
    formData.append("image", newImage);
    setUploading(true);
    setImageMessage("");
    try {
      const data = await updateProductImage(id, formData);
      setImageUrl(data.imageUrl);
      setNewImage(null);
      imageFormRef.current?.reset();
      setImageMessage("Image updated successfully.");
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate("/login", { replace: true });
        return;
      }
      setImageMessage(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <AdminLayout title="Edit Product"><div className="admin-empty">Loading product…</div></AdminLayout>;
  if (!form) return <AdminLayout title="Edit Product"><p className="admin-alert" role="alert">{error || "Product not found."}</p></AdminLayout>;

  return <AdminLayout title="Edit Product" subtitle="Update product details, stock, and catalogue imagery."
    actions={<Link className="admin-secondary-action" to="/admin/products">Back to products</Link>}>
    <div className="admin-edit-grid">
      <section className="admin-panel admin-form-panel">
        <div className="admin-panel-heading"><div><h2>Product details</h2><p>Changes apply to the live catalogue record.</p></div></div>
        <form className="admin-form" onSubmit={saveDetails}>
          <label>Name<input name="name" value={form.name} onChange={handleChange} required /></label>
          <label>Description<textarea name="description" value={form.description} onChange={handleChange} required /></label>
          <div className="admin-form-grid">
            <label>Category<select name="categoryId" value={form.categoryId} onChange={handleChange}
              disabled={categoriesLoading || categories.length === 0} required>
              <option value="">{categoriesLoading ? "Loading categories…" : "Select a category"}</option>
              {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select></label>
            <label>Price (₹)<input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} required /></label>
            <label>Stock<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} required /></label>
          </div>
          <button className="admin-primary-action" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Details"}</button>
        </form>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        {categoriesError && <p className="admin-alert" role="alert">{categoriesError}</p>}
        {!categoriesLoading && categories.length === 0 && <p className="admin-alert">Create or activate a category before saving this product.</p>}
      </section>
      <section className="admin-panel admin-image-panel">
        <div className="admin-panel-heading"><div><h2>Product image</h2><p>JPG, PNG, or WebP up to 5 MB.</p></div></div>
        {imageUrl && <img src={apiAssetUrl(imageUrl)} alt="Current product" />}
        <form className="admin-form" ref={imageFormRef} onSubmit={uploadImage}>
          <label>Replacement image<input type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setNewImage(event.target.files?.[0] || null)} required /></label>
          <button className="admin-secondary-action" type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Replace Image"}</button>
        </form>
        {imageMessage && <p className="admin-form-message" role="status">{imageMessage}</p>}
      </section>
    </div>
  </AdminLayout>;
}
