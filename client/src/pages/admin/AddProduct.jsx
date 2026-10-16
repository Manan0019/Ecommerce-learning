import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { createProduct } from "../../services/productService";
import { isAuthenticationError } from "../../services/apiClient";
import { useActiveCategories } from "../../hooks/useActiveCategories";
import { useSpecificationDefinition } from "../../hooks/useSpecificationDefinition";
import ProductSpecificationFields from "../../components/admin/ProductSpecificationFields";

export default function AddProduct() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { categories, categoriesLoading, categoriesError } = useActiveCategories();
  const [form, setForm] = useState({ name: "", brand: "", model: "", description: "", categoryId: "", price: "", stock: "" });
  const [specifications, setSpecifications] = useState({});
  const specification = useSpecificationDefinition(form.categoryId);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "categoryId") setSpecifications({});
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function updateSpecification(key, value) {
    setSpecifications((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!image) {
      setMessage("Please select a product image.");
      return;
    }
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append("specifications", JSON.stringify(specifications));
    formData.append("image", image);
    setLoading(true);
    setMessage("");
    try {
      await createProduct(formData);
      setMessage("Product created successfully.");
      setForm({ name: "", brand: "", model: "", description: "", categoryId: "", price: "", stock: "" });
      setSpecifications({});
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
        <div className="admin-form-grid two-column">
          <label>Brand<input name="brand" placeholder="Brand" value={form.brand} onChange={handleChange} maxLength={80} /></label>
          <label>Model<input name="model" placeholder="Model number or family" value={form.model} onChange={handleChange} maxLength={120} /></label>
        </div>
        <label>Description<textarea name="description" placeholder="Product description" value={form.description} onChange={handleChange} required /></label>
        <div className="admin-form-grid">
          <label>Category<select name="categoryId" value={form.categoryId} onChange={handleChange}
            disabled={categoriesLoading || categories.length === 0} required>
            <option value="">{categoriesLoading ? "Loading categories…" : "Select a category"}</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select></label>
          <label>Price (₹)<input type="number" name="price" placeholder="Price" min="0.01" step="0.01" value={form.price} onChange={handleChange} required /></label>
          <label>Stock<input type="number" name="stock" placeholder="Stock quantity" min="0" step="1" value={form.stock} onChange={handleChange} required /></label>
        </div>
        <ProductSpecificationFields definition={specification.definition} specifications={specifications}
          onChange={updateSpecification} loading={specification.loading} />
        {specification.error && <p className="admin-alert" role="alert">{specification.error}</p>}
        <label>Product image<input type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setImage(event.target.files?.[0] || null)} required /></label>
        <button className="admin-primary-action" type="submit" disabled={loading}>{loading ? "Creating…" : "Create Product"}</button>
      </form>
      {message && <p className="admin-form-message" role="status">{message}</p>}
      {categoriesError && <p className="admin-alert" role="alert">{categoriesError}</p>}
      {!categoriesLoading && categories.length === 0 && <p className="admin-alert">Create an active category before adding products.</p>}
    </section>
  </AdminLayout>;
}
