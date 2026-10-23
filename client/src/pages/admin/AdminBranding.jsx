import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import BrandLogo from "../../components/common/BrandLogo";
import FileUploadField from "../../components/admin/FileUploadField";
import { SITE_NAME } from "../../config/site";
import { apiAssetUrl } from "../../services/apiClient";
import { useBranding } from "../../hooks/useBranding";
import {
  resetBrandLogo, uploadBrandLogo, resetBrandFavicon, uploadBrandFavicon
} from "../../services/brandingService";

const MAX_BYTES = 5 * 1024 * 1024;
const accepted = new Set(["image/png", "image/jpeg", "image/webp"]);

function useLocalImage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function choose(event) {
    const next = event.target.files?.[0] || null;
    event.target.value = "";
    if (!next) return null;
    if (!accepted.has(next.type)) { setFile(null); setPreview(""); return "Choose PNG, JPG or WebP."; }
    if (next.size > MAX_BYTES) { setFile(null); setPreview(""); return "The maximum image size is 5 MB."; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    return null;
  }
  function clear() { setFile(null); setPreview(""); }
  return { file, preview, choose, clear };
}

function SymbolPreview({ source, label = SITE_NAME }) {
  return <span className="nx27-brand-combo nx27-demo-combo">
    {source
      ? <span className="nx27-brand-symbol"><img src={source} alt="" /></span>
      : <span className="brand-mark" aria-hidden="true">N</span>}
    <span className="nx27-brand-name-group"><strong className="nx27-brand-name">{label}</strong></span>
  </span>;
}

export default function AdminBranding() {
  const { iconUrl, faviconOverrideUrl, faviconUrl, refreshBranding } = useBranding();
  const icon = useLocalImage();
  const favicon = useLocalImage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const iconPreview = icon.preview || (iconUrl ? apiAssetUrl(iconUrl) : "");
  const faviconPreview = favicon.preview || (faviconUrl ? apiAssetUrl(faviconUrl) : "/favicon.svg");

  async function save(kind, event) {
    event.preventDefault();
    if (busy || !(kind === "icon" ? icon.file : favicon.file)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (kind === "icon") await uploadBrandLogo(icon.file);
      else await uploadBrandFavicon(favicon.file);
      await refreshBranding();
      if (kind === "icon") icon.clear();
      else favicon.clear();
      setNotice(kind === "icon"
        ? "Store symbol updated. The Nexora name remains in all branded areas."
        : "Browser favicon updated. The storefront name and symbol are unchanged.");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function restore(kind) {
    if (busy || !window.confirm(kind === "icon"
      ? "Restore the N symbol? The word Nexora will stay visible."
      : "Use the store symbol for the browser favicon again?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (kind === "icon") await resetBrandLogo();
      else await resetBrandFavicon();
      await refreshBranding();
      if (kind === "icon") icon.clear(); else favicon.clear();
      setNotice(kind === "icon" ? "Default N symbol restored." : "Favicon now follows your store symbol.");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <AdminLayout title="Brand identity" subtitle="Change the icon anytime. Nexora always stays visible as the store name.">
    <section className="admin-panel nx27-branding-panel">
      <div className="nx27-intro">
        <span className="nx27-eyebrow">STORE IDENTITY</span>
        <h2>One symbol. One recognizable name.</h2>
        <p>Use your logo <strong>without text</strong> here. We display your icon alongside the {SITE_NAME} wordmark throughout the store, including on mobile.</p>
      </div>
      {(error || notice) && <p className={`nx27-banner ${error ? "nx27-banner-error" : "nx27-banner-success"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
      <div className="nx27-branding-grid">
        <div className="nx27-branding-controls">
          <form onSubmit={(event) => save("icon", event)} className="nx27-setting-panel">
            <div className="nx27-panel-title"><span className="nx27-step">1</span><div><h3>Store logo icon</h3><p>Header, footer, admin panel and login pages</p></div></div>
            <FileUploadField label="Upload a symbol-only image" help="PNG, JPEG or WebP · 5 MB maximum" disabled={busy} selection={icon.file?.name || ""}
              onChange={(event) => { const message = icon.choose(event); setError(message || ""); setNotice(""); }} />
            <p className="nx27-hint">Recommended: square transparent PNG, at least 256 × 256 pixels. Wide logos containing the brand name are not supported as icons.</p>
            <div className="nx27-control-actions">
              <button className="admin-primary-action" disabled={!icon.file || busy} type="submit">{busy ? "Please wait…" : "Save store icon"}</button>
              {iconUrl && <button type="button" className="nx27-secondary" disabled={busy} onClick={() => restore("icon")}>Restore N icon</button>}
            </div>
          </form>
          <form onSubmit={(event) => save("favicon", event)} className="nx27-setting-panel">
            <div className="nx27-panel-title"><span className="nx27-step">2</span><div><h3>Browser favicon</h3><p>Browser tabs, bookmarks and compatible home-screen icons</p></div></div>
            <FileUploadField label="Optional separate favicon" help="PNG, JPEG or WebP · 5 MB maximum" disabled={busy} selection={favicon.file?.name || ""}
              onChange={(event) => { const message = favicon.choose(event); setError(message || ""); setNotice(""); }} />
            <p className="nx27-hint">Leave this empty to use your store icon automatically. A separate square image can improve visibility in tiny browser tabs.</p>
            <div className="nx27-control-actions">
              <button className="admin-primary-action" disabled={!favicon.file || busy} type="submit">{busy ? "Please wait…" : "Save favicon"}</button>
              {faviconOverrideUrl && <button type="button" className="nx27-secondary" disabled={busy} onClick={() => restore("favicon")}>Use store icon</button>}
            </div>
          </form>
        </div>
        <div className="nx27-preview-column">
          <section className="nx27-setting-panel">
            <h3>Live brand preview</h3>
            <div className="nx27-preview nx27-preview-light"><small>Light storefront</small><SymbolPreview source={iconPreview} /></div>
            <div className="nx27-preview nx27-preview-dark"><small>Dark admin / login</small><SymbolPreview source={iconPreview} /></div>
            <p className="nx27-hint">Current saved identity: <BrandLogo />. Upload previews above show your selection before saving.</p>
          </section>
          <section className="nx27-setting-panel">
            <h3>Browser tab preview</h3>
            <div className="nx27-tab"><img src={faviconPreview} alt="Favicon preview" /><span>Nexora | Discover more</span><span aria-hidden="true">×</span></div>
            <p className="nx27-hint">The full {SITE_NAME} text stays in the browser title. Only the small favicon graphic changes.</p>
          </section>
        </div>
      </div>
    </section>
  </AdminLayout>;
}
