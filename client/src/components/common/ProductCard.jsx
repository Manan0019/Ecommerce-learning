import { Link } from "react-router-dom";
import { apiAssetUrl } from "../../services/apiClient";

export default function ProductCard({ product }) {
  return <article className="product-card">
    <Link className="product-image-link" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
      {product.imageUrl
        ? <img src={apiAssetUrl(product.imageUrl)} alt={product.name} loading="lazy" />
        : <div className="missing-image">Image coming soon</div>}
      {product.stock === 0 && <span className="product-badge">Sold out</span>}
    </Link>
    <div className="product-info">
      <p className="product-category">{product.category}</p>
      {(product.brand || product.model) && <p className="product-brand">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>}
      <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
      <div className="product-meta">
        <p className="product-price">{Number(product.mrp)>Number(product.price)&&<><span className="detail-discount">↓{Math.round((Number(product.mrp)-Number(product.price))/Number(product.mrp)*100)}% </span><s className="detail-mrp">₹{Number(product.mrp).toLocaleString("en-IN")}</s> </>}₹{Number(product.price).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
        <span>{product.stock > 0 ? "Available" : "Out of stock"}</span>
      </div>
    </div>
  </article>;
}
