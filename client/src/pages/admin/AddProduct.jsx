import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { createProduct } from "../../services/productService";
import { isAuthenticationError } from "../../services/apiClient";

export default function AddProduct() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [form, setForm] = useState({ name: "", description: "", category: "", price: "", stock: "" });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!image) {
      setMessage("Please select a product image.");
      return;
    }
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append("image", image);
    setLoading(true);
    setMessage("");
    try {
      await createProduct(formData);
      setMessage("Product created successfully.");
      setForm({ name: "", description: "", category: "", price: "", stock: "" });
      setImage(null);
      formRef.current?.reset();
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate("/login", { replace: true });
        return;
      }
      setMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <AdminLayout title="Add Product" subtitle="Create a new product and upload its catalogue image."
    actions={<Link className="admin-secondary-action" to="/admin/products">Cancel</Link>}>
    <section className="admin-panel admin-form-panel">
      <form className="admin-form" ref={formRef} onSubmit={handleSubmit}>
        <label>Product name<input name="name" placeholder="Product name" value={form.name} onChange={handleChange} required /></label>
        <label>Description<textarea name="description" placeholder="Product description" value={form.description} onChange={handleChange} required /></label>
        <div className="admin-form-grid">
          <label>Category<input name="category" placeholder="Category" value={form.category} onChange={handleChange} required /></label>
          <label>Price (₹)<input type="number" name="price" placeholder="Price" min="0.01" step="0.01" value={form.price} onChange={handleChange} required /></label>
          <label>Stock<input type="number" name="stock" placeholder="Stock quantity" min="0" step="1" value={form.stock} onChange={handleChange} required /></label>
        </div>
        <label>Product image<input type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setImage(event.target.files?.[0] || null)} required /></label>
        <button className="admin-primary-action" type="submit" disabled={loading}>{loading ? "Creating…" : "Create Product"}</button>
      </form>
      {message && <p className="admin-form-message" role="status">{message}</p>}
    </section>
  </AdminLayout>;
}
