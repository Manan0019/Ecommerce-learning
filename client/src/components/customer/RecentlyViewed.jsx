import { useEffect, useState } from "react";
import UiIcon from "../common/UiIcon";
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
  return <section className="store-section nx37-recent-section nx48-recent-section" aria-labelledby="nx-recent-heading">
    <div className="section-heading"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="nx-recent-heading">Recently viewed</h2></div><button className="nx37-text-button" type="button" onClick={() => clearRecentlyViewed()}>Clear viewed items</button></div>
    <div className="nx48-recent-grid">{items.map(item => <Link to={`/products/${encodeURIComponent(item.id)}`} key={item.id} className="nx48-recent-card">
      <span className="nx48-recent-image">{item.imageUrl ? <img alt={item.name} src={apiAssetUrl(item.imageUrl)} loading="lazy"/> : <span aria-hidden="true"><UiIcon name="bag" size={35}/></span>}</span>
      <span className="nx48-recent-copy"><small>{item.category || "Discover Nexora"}</small><strong>{item.name}</strong><span className="nx48-recent-cta">View details <UiIcon name="up-right" size={16}/></span></span>
    </Link>)}</div>
  </section>;
}
