import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
    async function load() {
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
        const p = data.product;
        setForm({ name: p.name, description: p.description, category: p.category,
          price: p.price, stock: String(p.stock) });
        setImageUrl(p.imageUrl);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [id, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
  }
  async function saveDetails(event) {
    event.preventDefault(); setSaving(true); setError("");
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
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  async function uploadImage(event) {
    event.preventDefault();
    if (!newImage) { setImageMessage("Choose an image first."); return; }
    const formData = new FormData();
    formData.append("image", newImage);
    setUploading(true); setImageMessage("");
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
    } catch (err) { setImageMessage(err.message); }
    finally { setUploading(false); }
  }
  if (loading) return <p>Loading product...</p>;
  if (!form) return <p role="alert">{error || "Product not found."}</p>;
  return (
    <main className="auth-container">
      <p><Link to="/admin/products">← Back to Products</Link></p>
      <h1>Edit Product</h1>
      <form onSubmit={saveDetails}>
        <label>Name<input name="name" value={form.name} onChange={handleChange} required /></label>
        <label>Description<textarea name="description" value={form.description} onChange={handleChange} required /></label>
        <label>Category<input name="category" value={form.category} onChange={handleChange} required /></label>
        <label>Price (₹)<input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} required /></label>
        <label>Stock<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} required /></label>
        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Details"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <hr />
      <h2>Replace Image</h2>
      {imageUrl && <img src={`${API_BASE_URL}${imageUrl}`} alt="Current product" width={200} />}
      <form ref={imageFormRef} onSubmit={uploadImage}>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setNewImage(e.target.files?.[0] || null)} required />
        <button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Replace Image"}</button>
      </form>
      {imageMessage && <p role="status">{imageMessage}</p>}
    </main>
  );
}
