import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { API_BASE_URL } from "../config/api";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const imageFormRef = useRef(null);
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
        const response = await fetch(`${API_BASE_URL}/api/admin/products/${id}`, {
          credentials: "include", signal: controller.signal
        });
        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true }); return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load product.");
        if (controller.signal.aborted) return;
        const product = data.product;
        setForm({ name: product.name, description: product.description, category: product.category,
          price: product.price, stock: String(product.stock) });
        setImageUrl(product.imageUrl);
      } catch (requestError) {
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
      const response = await fetch(`${API_BASE_URL}/api/admin/products/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stock: Number(form.stock) })
      });
      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true }); return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save changes.");
      navigate("/admin/products", { replace: true });
    } catch (requestError) {
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
      const response = await fetch(`${API_BASE_URL}/api/admin/products/${id}/image`, {
        method: "PUT", credentials: "include", body: formData
      });
      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true }); return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Image replacement failed.");
      setImageUrl(data.imageUrl);
      setNewImage(null);
      imageFormRef.current?.reset();
      setImageMessage("Image updated successfully.");
    } catch (requestError) {
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
            <label>Category<input name="category" value={form.category} onChange={handleChange} required /></label>
            <label>Price (₹)<input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} required /></label>
            <label>Stock<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} required /></label>
          </div>
          <button className="admin-primary-action" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Details"}</button>
        </form>
        {error && <p className="admin-alert" role="alert">{error}</p>}
      </section>
      <section className="admin-panel admin-image-panel">
        <div className="admin-panel-heading"><div><h2>Product image</h2><p>JPG, PNG, or WebP up to 5 MB.</p></div></div>
        {imageUrl && <img src={`${API_BASE_URL}${imageUrl}`} alt="Current product" />}
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
