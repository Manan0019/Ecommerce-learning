import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import {
  createCategory,
  deleteCategory,
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
  const [menuIcon, setMenuIcon] = useState(null);
  const [removeMenuIcon, setRemoveMenuIcon] = useState(false);
  const [parentId, setParentId] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteName, setDeleteName] = useState("");
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
    setMenuIcon(null);
    setRemoveMenuIcon(false);
    setParentId("");
    setEditing(null);
    setModalOpen(false);
    formRef.current?.reset();
  }

  function beginEdit(category) {
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId || "");
    setImage(null);
    setMenuIcon(null);
    setRemoveMenuIcon(false);
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (name.trim().length < 2) { setError("Enter a category name with at least two characters."); return; }
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("parentId", parentId);
    if (image) formData.append("image", image);
    if (menuIcon) formData.append("menuIcon", menuIcon);
    if (removeMenuIcon && !menuIcon) formData.append("removeMenuIcon", "true");
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

  async function confirmDelete(event) {
    event.preventDefault();
    if (!deleting || deleteName !== deleting.name) return;
    setBusyId(deleting.id);
    setError("");
    setMessage("");
    try {
      const result = await deleteCategory(deleting.id, deleteName);
      setCategories(current => current.filter(item => item.id !== deleting.id));
      setDeleting(null);
      setDeleteName("");
      setMessage(result.message);
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
    subtitle="Organize the catalogue with reusable, customer-facing categories."
    actions={<button type="button" className="admin-primary-action" onClick={() => { setEditing(null); setName(""); setImage(null); setParentId(""); setError(""); setMessage(""); setModalOpen(true); }}>+ Add category</button>}>
    <div className="admin-category-layout nx-category-layout">
      {modalOpen && <Modal title={editing ? "Edit category" : "Add category"} subtitle="Choose a cover image and an optional square icon for the dropdown." size="medium" closeDisabled={saving} onClose={resetForm}>
      <section className="admin-panel admin-form-panel admin-category-form" ref={formRef}>
        <div className="admin-panel-heading">
          <div>
            <h2>{editing ? "Edit category" : "Create category"}</h2>
            <p>Use a colourful collection image for category pages and a separate small icon for the navigation menu.</p>
          </div>
          {editing && <button className="admin-text-button" type="button" onClick={resetForm}>Cancel</button>}
        </div>
        <form className="admin-form" onSubmit={saveCategory}>
          <label>Parent category <select value={parentId} onChange={event=>setParentId(event.target.value)}><option value="">Top-level category</option>{categories.filter(c=>String(c.id)!==String(editing?.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label><span className="nx34-field-label">Category name <b className="nx34-required" aria-hidden="true">*</b></span>
            <input value={name} onChange={(event) => setName(event.target.value)}
              minLength={2} maxLength={80} required />
          </label>
          <div className="nx36-category-images" aria-label="Category artwork slots">
            <label className="nx36-image-slot">
              <span className="nx36-slot-title">Collection image</span>
              <small>Shown on category cards and collection pages. Choose a colourful photo.</small>
              {editing?.imageUrl && !image && <img className="nx36-slot-preview" alt="Current collection artwork" src={apiAssetUrl(editing.imageUrl)} />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} />
              {image && <small className="nx36-selected-file">Selected: {image.name}</small>}
            </label>
            <label className="nx36-image-slot">
              <span className="nx36-slot-title">Dropdown menu icon</span>
              <small>Small square symbol, ideally a transparent PNG (160×160 px or larger).</small>
              {editing?.menuIconUrl && !menuIcon && !removeMenuIcon && <img className="nx36-icon-preview" alt="Current navigation icon" src={apiAssetUrl(editing.menuIconUrl)} />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {setMenuIcon(event.target.files?.[0] || null);setRemoveMenuIcon(false);}} />
              {menuIcon && <small className="nx36-selected-file">Selected: {menuIcon.name}</small>}
              {editing?.menuIconUrl && <span className="nx36-clear-icon"><input type="checkbox" checked={removeMenuIcon} onChange={(event)=>{setRemoveMenuIcon(event.target.checked);if(event.target.checked)setMenuIcon(null);}} />Remove custom menu icon</span>}
            </label>
          </div>
          <button className="admin-primary-action" type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Category" : "Create Category"}
          </button>
        </form>
        {message && <p className="admin-form-message" role="status">{message}</p>}
        {error && <p className="admin-alert" role="alert">{error}</p>}
      </section>
      </Modal>}

      {deleting && <Modal title={`Delete ${deleting.name}?`} subtitle="Permanent deletion is available only for categories with no assigned products, child categories or promotions." size="medium" closeDisabled={busyId === deleting.id} onClose={() => { setDeleting(null); setDeleteName(""); setError(""); }}>
        <form className="admin-form" onSubmit={confirmDelete}>
          <p>Move products to another category, remove all nested subcategories, and update any promotions first. Deactivate instead if you want to keep this category.</p>
          <label>Type <strong>{deleting.name}</strong> to confirm
            <input value={deleteName} onChange={event => setDeleteName(event.target.value)} autoComplete="off" required />
          </label>
          {error && <p role="alert" className="admin-alert">{error}</p>}
          <div className="admin-row-actions">
            <button type="button" onClick={() => { setDeleting(null); setDeleteName(""); setError(""); }} disabled={busyId === deleting.id}>Cancel</button>
            <button type="submit" className="nx21-delete-button" disabled={busyId === deleting.id || deleteName !== deleting.name}>
              {busyId === deleting.id ? "Deleting…" : "Permanently delete category"}
            </button>
          </div>
        </form>
      </Modal>}

      <section className="admin-panel admin-category-list">
        {message && !modalOpen && !deleting && <p role="status" className="admin-form-message">{message}</p>}
        {error && !modalOpen && !deleting && <p role="alert" className="admin-alert">{error}</p>}
        <div className="admin-panel-heading admin-category-heading">
          <div><h2>Category directory</h2><p>Empty leaf categories can be permanently deleted; those in use can be deactivated.</p></div>
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
                <div><h3>{category.name}</h3><p>{category.parentName ? `Under ${category.parentName} · ` : ""}/{category.slug}</p></div>
                <dl><div><dt>Products</dt><dd>{category.productCount}</dd></div>
                  <div><dt>Status</dt><dd><span className={`admin-status ${category.isActive ? "is-active" : "is-inactive"}`}>
                    {category.isActive ? "Active" : "Inactive"}</span></dd></div></dl>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => beginEdit(category)}>Edit</button>
                  <button type="button" disabled={busyId === category.id} onClick={() => changeStatus(category)}>
                    {busyId === category.id ? "Saving…" : category.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" className="nx21-delete-button" disabled={busyId === category.id} onClick={() => { setDeleting(category); setDeleteName(""); setError(""); setMessage(""); }}>Delete</button>
                </div>
              </div>
            </article>)}
          </div>}
      </section>
    </div>
  </AdminLayout>;
}
