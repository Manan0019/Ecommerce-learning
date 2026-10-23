import FileUploadField from "../../components/admin/FileUploadField";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import UiIcon from "../../components/common/UiIcon";
import CategoryPathSelector, {categoryDepth} from "../../components/admin/CategoryPathSelector";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
  updateCategoryStatus
} from "../../services/categoryService";

function categoryPath(category, categories) {
  if (!category) return '';
  const segments=[category.name], seen=new Set([String(category.id)]);
  let current=category;
  while (current.parentId && !seen.has(String(current.parentId))) {
    seen.add(String(current.parentId));
    const parent=categories.find(item=>String(item.id)===String(current.parentId));
    if (!parent) break;
    segments.unshift(parent.name);current=parent;
  }
  return segments.join(' / ');
}
export default function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [layout,setLayout]=useState('table');
  const [levelFilter,setLevelFilter]=useState('all');
  const [statusFilter,setStatusFilter]=useState('all');
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [menuIcon, setMenuIcon] = useState(null);
  const [removeMenuIcon, setRemoveMenuIcon] = useState(false);
  const [parentId, setParentId] = useState("");
  const [creatingLevel,setCreatingLevel]=useState(1);
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
    return categories.filter(category => {
      const path=categoryPath(category,categories);
      return (!cleanQuery || `${path} ${category.slug}`.toLowerCase().includes(cleanQuery))
        && (levelFilter==='all'||(levelFilter==='root'?!category.parentId:Boolean(category.parentId)))
        && (statusFilter==='all'||(statusFilter==='active'?category.isActive:!category.isActive));
    });
  }, [categories, query,levelFilter,statusFilter]);
  const parentChoices = useMemo(()=>categories.filter(candidate=>{
    if(String(candidate.id)===String(editing?.id))return false;
    if(!editing)return true;
    let cursor=candidate;
    const visited=new Set();
    while(cursor&&!visited.has(String(cursor.id))){
      if(String(cursor.id)===String(editing.id))return false;
      visited.add(String(cursor.id));
      cursor=categories.find(item=>String(item.id)===String(cursor.parentId));
    }
    return true;
  }).sort((a,b)=>categoryPath(a,categories).localeCompare(categoryPath(b,categories))),[categories,editing?.id]);
  const selectedParent=categories.find(c=>String(c.id)===String(parentId));
  const newPath=`${selectedParent?`${categoryPath(selectedParent,categories)} / `:''}${name.trim()||'New category'}`;

  function resetForm() {
    setName("");
    setImage(null);
    setMenuIcon(null);
    setRemoveMenuIcon(false);
    setParentId("");
    setCreatingLevel(1);
    setEditing(null);
    setModalOpen(false);
  }

  function beginEdit(category) {
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId || "");
    setCreatingLevel(Math.max(1,Math.min(8,categoryDepth(categories,category.id))));
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
    if(creatingLevel>1 && (!parentId||categoryDepth(categories,parentId)!==creatingLevel-1)){setError("Select every parent level before creating this category.");return;}
    if(creatingLevel===1&&parentId){setError("Top-level categories must not have a parent.");return;}
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
    actions={<button type="button" className="admin-primary-action" onClick={() => { setEditing(null); setName(""); setImage(null); setParentId("");setCreatingLevel(1); setError(""); setMessage(""); setModalOpen(true); }}>+ Add category</button>}>
    <div className="admin-category-layout nx-category-layout">
      {modalOpen && <Modal title={editing ? "Edit category" : "Add category"} subtitle="Choose a cover image and an optional square icon for the dropdown." size="medium" closeDisabled={saving} onClose={resetForm}>
      <section className="admin-panel admin-form-panel admin-category-form nx69-category-form">
        <div className="admin-panel-heading">
          <div>
            <h2>{editing ? "Edit category" : "Create category"}</h2>
            <p>Use a colourful collection image for category pages and a separate small icon for the navigation menu.</p>
          </div>
          {editing && <button className="admin-text-button" type="button" onClick={resetForm}>Cancel</button>}
        </div>
        <form className="admin-form" onSubmit={saveCategory}>
          <div className="nx71-category-creation">
            <h3>1 · What would you like to add?</h3>
            <p>Choose the category level first. Nexora will show only the parent categories needed for that level.</p>
            <div className="nx71-level-cards" role="radiogroup" aria-label="Category depth">
              {Array.from({length:Math.min(8,Math.max(4,...categories.map(c=>categoryDepth(categories,c.id)+1)))},(_,i)=>['Main category','Subcategory','Sub-subcategory','Fourth-level category'][i]||`Level ${i+1} category`).map((title,i)=><label className={creatingLevel===i+1?'is-selected':''} key={title}>
                <input type="radio" name="category-creation-depth" value={i+1} checked={creatingLevel===i+1} onChange={()=>{setCreatingLevel(i+1);setParentId('');}}/>
                <strong>{title}</strong><small>{i===0?'New top-level department':`Inside ${i} existing ${i===1?'level':'levels'}`}</small>
              </label>)}
            </div>
            {creatingLevel>1&&<div className="nx71-parent-path"><h3>2 · Select the parent path</h3>
              <CategoryPathSelector idPrefix="nx71-category-parent" categories={parentChoices} value={parentId} onChange={setParentId} depth={creatingLevel-1} required label="Where does it belong?"/>
            </div>}
          </div>
          <p className="nx69-category-preview" aria-live="polite"><UiIcon name="grid" size={17}/> Preview: <strong>{newPath}</strong></p>
          <label><span className="nx34-field-label">Category name <b className="nx34-required" aria-hidden="true">*</b></span>
            <input value={name} onChange={(event) => setName(event.target.value)}
              minLength={2} maxLength={80} required />
          </label>
          <div className="nx36-category-images" aria-label="Category artwork slots">
            <div className="nx36-image-slot">
              <span className="nx36-slot-title">Collection image</span>
              <small>Shown on category cards and collection pages. Choose a colourful photo.</small>
              {editing?.imageUrl && !image && <img className="nx36-slot-preview" alt="Current collection artwork" src={apiAssetUrl(editing.imageUrl)} />}
              <FileUploadField label="Choose collection image" selection={image?.name||''} onChange={(event) => setImage(event.target.files?.[0] || null)}/>
              {image && <small className="nx36-selected-file">Selected: {image.name}</small>}
            </div>
            <div className="nx36-image-slot">
              <span className="nx36-slot-title">Dropdown menu icon</span>
              <small>Small square symbol, ideally a transparent PNG (160×160 px or larger).</small>
              {editing?.menuIconUrl && !menuIcon && !removeMenuIcon && <img className="nx36-icon-preview" alt="Current navigation icon" src={apiAssetUrl(editing.menuIconUrl)} />}
              <FileUploadField label="Choose menu icon" selection={menuIcon?.name||''} onChange={(event) => {setMenuIcon(event.target.files?.[0] || null);setRemoveMenuIcon(false);}}/>
              {menuIcon && <small className="nx36-selected-file">Selected: {menuIcon.name}</small>}
              {editing?.menuIconUrl && <span className="nx36-clear-icon"><input type="checkbox" checked={removeMenuIcon} onChange={(event)=>{setRemoveMenuIcon(event.target.checked);if(event.target.checked)setMenuIcon(null);}} />Remove custom menu icon</span>}
            </div>
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

      <section className="admin-panel admin-category-list nx69-category-directory">
        {message && !modalOpen && !deleting && <p role="status" className="admin-form-message">{message}</p>}
        {error && !modalOpen && !deleting && <p role="alert" className="admin-alert">{error}</p>}
        <div className="admin-panel-heading admin-category-heading">
          <div><h2>Category directory</h2><p>Browse departments and nested categories. Select a category to edit its name, placement or images.</p></div>
        </div>
        <div className="nx69-category-toolbar">
          <label className="admin-search nx69-search"><span className="sr-only">Search categories</span><UiIcon name="search" size={18}/><input type="search" placeholder="Search categories or paths" value={query} onChange={event=>setQuery(event.target.value)}/></label>
          <select aria-label="Filter by category level" value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}><option value="all">All levels</option><option value="root">Main categories</option><option value="nested">Subcategories</option></select>
          <select aria-label="Filter by category status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <div className="nx69-view-switch" aria-label="Directory layout"><button type="button" aria-label="Table view" aria-pressed={layout==='table'} onClick={()=>setLayout('table')}><UiIcon name="grid" size={17}/><span>Table</span></button><button type="button" aria-label="Card view" aria-pressed={layout==='cards'} onClick={()=>setLayout('cards')}><UiIcon name="images" size={17}/><span>Cards</span></button></div>
        </div>
        {loading ? <div className="admin-empty">Loading categories…</div>
          : categories.length === 0 ? <div className="admin-empty">No categories yet. Create the first category.</div>
          : filteredCategories.length === 0 ? <div className="admin-empty">No categories match “{query}”.</div>
          : layout==='table' ? <div className="admin-table-wrap nx69-category-table-wrap"><table className="admin-table nx69-category-table"><thead><tr><th>Category / path</th><th>Level</th><th>Products</th><th>Status</th><th>Manage</th></tr></thead><tbody>{filteredCategories.map(category=><tr key={category.id}>
             <td><div className="nx69-category-name-cell">{category.imageUrl?<img src={apiAssetUrl(category.imageUrl)} alt=""/>:<span className="nx69-category-initial">{category.name.slice(0,1)}</span>}<span><strong>{category.name}</strong><small>{categoryPath(category,categories)}</small></span></div></td>
             <td>{category.parentId?'Subcategory':'Main category'}</td><td>{category.productCount}</td><td><span className={`admin-status ${category.isActive?'is-active':'is-inactive'}`}>{category.isActive?'Active':'Inactive'}</span></td>
             <td><div className="admin-row-actions nx69-row-actions"><button className="nx69-icon-action" type="button" onClick={()=>beginEdit(category)} aria-label={`Edit ${category.name}`} title="Edit category"><UiIcon name="edit" size={17}/></button><button className="nx69-icon-action" type="button" disabled={busyId===category.id} onClick={()=>changeStatus(category)} aria-label={`${category.isActive?'Deactivate':'Activate'} ${category.name}`} title={category.isActive?'Deactivate':'Activate'}><UiIcon name={category.isActive?'ban':'check'} size={17}/></button><button className="nx69-icon-action nx69-icon-danger" type="button" disabled={busyId===category.id} onClick={()=>{setDeleting(category);setDeleteName('');setError('');setMessage('');}} aria-label={`Delete ${category.name}`} title="Delete category"><UiIcon name="trash" size={17}/></button></div></td>
            </tr>)}</tbody></table></div>
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
                  <button type="button" className="nx69-icon-action" aria-label={`Edit ${category.name}`} title="Edit category" onClick={() => beginEdit(category)}><UiIcon name="edit" size={18}/></button>
                  <button type="button" className="nx69-icon-action" aria-label={`${category.isActive?'Deactivate':'Activate'} ${category.name}`} title={category.isActive?'Deactivate':'Activate'} disabled={busyId === category.id} onClick={() => changeStatus(category)}><UiIcon name={category.isActive?'ban':'check'} size={18}/></button>
                  <button type="button" className="nx69-icon-action nx69-icon-danger" aria-label={`Delete ${category.name}`} title="Delete category" disabled={busyId === category.id} onClick={() => { setDeleting(category); setDeleteName(""); setError(""); setMessage(""); }}><UiIcon name="trash" size={18}/></button>
                </div>
              </div>
            </article>)}
          </div>}
      </section>
    </div>
  </AdminLayout>;
}
