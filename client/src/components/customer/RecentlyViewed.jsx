import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiAssetUrl } from "../../services/apiClient";
import { readRecentlyViewed, clearRecentlyViewed } from "../../services/recentlyViewed";
export default function RecentlyViewed() {
  const [items, setItems] = useState(() => readRecentlyViewed());
  useEffect(() => {
    const refresh = () => setItems(readRecentlyViewed());
    window.addEventListener("storage", refresh);
    window.addEventListener("nexora-recent-changed", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("nexora-recent-changed", refresh); };
  }, []);
  if (!items.length) return null;
  return <section className="store-section nx37-recent-section" aria-labelledby="nx-recent-heading">
    <div className="section-heading"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="nx-recent-heading">Recently viewed</h2></div><button className="nx37-text-button" type="button" onClick={() => clearRecentlyViewed()}>Clear history</button></div>
    <div className="nx37-recent-row">{items.map(item => <Link to={`/products/${encodeURIComponent(item.id)}`} key={item.id} className="nx37-recent-card">
      <span className="nx37-recent-image">{item.imageUrl ? <img alt="" src={apiAssetUrl(item.imageUrl)} loading="lazy"/> : <span aria-hidden="true">✧</span>}</span>
      <span className="nx37-recent-copy"><small>{item.category || "Nexora collection"}</small><strong>{item.name}</strong><em>View product ↗</em></span>
    </Link>)}</div>
    <p className="nx37-recent-note">Saved only in this browser. Clear history whenever you like; prices and availability are checked when you open a product.</p>
  </section>;
}
