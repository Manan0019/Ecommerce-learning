import { useEffect, useState } from "react";
import UiIcon from "../common/UiIcon";
import { Link } from "react-router-dom";
import { apiAssetUrl } from "../../services/apiClient";
import {getProduct} from '../../services/productService';
import StorefrontCardActions from "./StorefrontCardActions";
import { readRecentlyViewed, clearRecentlyViewed } from "../../services/recentlyViewed";
export default function RecentlyViewed() {
  const [items, setItems] = useState(() => readRecentlyViewed());
  const [liveProducts,setLiveProducts]=useState({});
  useEffect(() => {
    const refresh = () => setItems(readRecentlyViewed());
    window.addEventListener("storage", refresh);
    window.addEventListener("nexora-recent-changed", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("nexora-recent-changed", refresh); };
  }, []);
  useEffect(()=>{
    if(!items.length)return undefined;
    const controller=new AbortController();
    // Current inventory and variant eligibility must come from server, never from cached localStorage.
    Promise.all(items.map(async item=>{
      try{const response=await getProduct(item.id,controller.signal);return {id:item.id,product:response.product};}
      catch{return {id:item.id,product:null};}
    })).then(result=>{if(!controller.signal.aborted)setLiveProducts(Object.fromEntries(result.map(r=>[r.id,r.product])));});
    return ()=>controller.abort();
  },[items]);
  if (!items.length) return null;
  return <section className="store-section nx37-recent-section nx48-recent-section" aria-labelledby="nx-recent-heading">
    <div className="section-heading"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="nx-recent-heading">Recently viewed</h2></div><button className="nx37-text-button" type="button" onClick={() => clearRecentlyViewed()}>Clear viewed items</button></div>
    <div className="nx48-recent-grid">{items.map(item => {
      const detailUrl = `/products/${encodeURIComponent(item.id)}`;
      const latest=liveProducts[item.id];
      const product = { ...item, ...(latest||{}), parentProductId: item.id,
        stock: latest?Number(latest.stock||0):0,
        hasVariants: latest?Boolean(latest.hasVariants):true };
      return <article key={item.id} className="nx48-recent-card nx62-recent-card">
        <div className="nx62-recent-stage">
          <Link to={detailUrl} className="nx48-recent-image">{item.imageUrl ? <img alt={item.name} src={apiAssetUrl(item.imageUrl)} loading="lazy"/> : <span aria-hidden="true"><UiIcon name="bag" size={35}/></span>}</Link>
          {latest && <StorefrontCardActions product={product} detailUrl={detailUrl} imageUrl={latest.imageUrl || item.imageUrl}/>}
        </div>
        <div className="nx48-recent-copy"><small>{item.category || "Discover Nexora"}</small><Link to={detailUrl} className="nx62-recent-name">{item.name}</Link><Link to={detailUrl} className="nx48-recent-cta">View details <UiIcon name="chevron-right" size={16}/></Link></div>
      </article>;
    })}</div>
  </section>;
}
