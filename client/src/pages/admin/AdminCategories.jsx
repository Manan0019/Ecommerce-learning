import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import {
  createCategory,
  getAdminCategories,
  updateCategory,
  updateCategoryStatus
} from "../../services/categoryService";

export default function AdminCategories() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadCategories() {
      try {
        const data = await getAdminCategories(controller.signal);
        if (!controller.signal.aborted) setCategories(data.categories);
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
    loadCategories();
    return () => controller.abort();
  }, [navigate]);

  const filteredCategories = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return categories;
    return categories.filter((category) =>
      `${category.name} ${category.slug}`.toLowerCase().includes(cleanQuery));
  }, [categories, query]);

  function resetForm() {
    setName("");
    setImage(null);
    setEditing(null);
    formRef.current?.reset();
  }

  function beginEdit(category) {
    setEditing(category);
    setName(category.name);
    setImage(null);
    setError("");
    setMessage("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveCategory(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    if (image) formData.append("image", image);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = editing
        ? await updateCategory(editing.id, formData)
        : await createCategory(formData);
      setCategories((current) => {
        const next = editing
          ? current.map((category) => category.id === data.category.id ? data.category : category)
          : [...current, data.category];
        return next.sort((left, right) => left.name.localeCompare(right.name));
      });
      setMessage(data.message);
      resetForm();
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

  async function changeStatus(category) {
    setBusyId(category.id);
    setError("");
    setMessage("");
    try {
      const data = await updateCategoryStatus(category.id, !category.isActive);
      setCategories((current) => current.map((item) =>
        item.id === category.id ? data.category : item));
      setMessage(data.message);
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  return <AdminLayout title="Manage Categories"
    subtitle="Organize the catalogue with reusable, customer-facing categories.">
    <div className="admin-category-layout">
      <section className="admin-panel admin-form-panel admin-category-form" ref={formRef}>
        <div className="admin-panel-heading">
          <div>
            <h2>{editing ? "Edit category" : "Create category"}</h2>
            <p>{editing ? "Update the category name or replace its image." : "Images are optional and can be added later."}</p>
          </div>
          {editing && <button className="admin-text-button" type="button" onClick={resetForm}>Cancel</button>}
        </div>
        <form className="admin-form" onSubmit={saveCategory}>
          <label>Category name
            <input value={name} onChange={(event) => setName(event.target.value)}
              minLength={2} maxLength={80} required />
          </label>
          <label>{editing ? "Replacement image (optional)" : "Category image (optional)"}
            <input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImage(event.target.files?.[0] || null)} />
          </label>
          <button className="admin-primary-action" type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Category" : "Create Category"}
          </button>
        </form>
        {message && <p className="admin-form-message" role="status">{message}</p>}
        {error && <p className="admin-alert" role="alert">{error}</p>}
      </section>

      <section className="admin-panel admin-category-list">
        <div className="admin-panel-heading admin-category-heading">
          <div><h2>Category directory</h2><p>Categories with products can be deactivated but are never deleted.</p></div>
          <label className="admin-search">
            <span className="sr-only">Search categories</span>
            <input type="search" placeholder="Search categories" value={query}
              onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        {loading ? <div className="admin-empty">Loading categories…</div>
          : categories.length === 0 ? <div className="admin-empty">No categories yet. Create the first category.</div>
          : filteredCategories.length === 0 ? <div className="admin-empty">No categories match “{query}”.</div>
          : <div className="admin-category-grid">
            {filteredCategories.map((category) => <article className="admin-category-card" key={category.id}>
              <div className="admin-category-image">
                {category.imageUrl
                  ? <img src={apiAssetUrl(category.imageUrl)} alt="" />
                  : <span aria-hidden="true">{category.name.slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="admin-category-copy">
                <div><h3>{category.name}</h3><p>/{category.slug}</p></div>
                <dl><div><dt>Products</dt><dd>{category.productCount}</dd></div>
                  <div><dt>Status</dt><dd><span className={`admin-status ${category.isActive ? "is-active" : "is-inactive"}`}>
                    {category.isActive ? "Active" : "Inactive"}</span></dd></div></dl>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => beginEdit(category)}>Edit</button>
                  <button type="button" disabled={busyId === category.id} onClick={() => changeStatus(category)}>
                    {busyId === category.id ? "Saving…" : category.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </article>)}
          </div>}
      </section>
    </div>
  </AdminLayout>;
}
