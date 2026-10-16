import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function ProductCard({ product }) {
  return <article className="product-card">
    <Link className="product-image-link" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
      {product.imageUrl
        ? <img src={`${API_BASE_URL}${product.imageUrl}`} alt={product.name} loading="lazy" />
        : <div className="missing-image">Image coming soon</div>}
      {product.stock === 0 && <span className="product-badge">Sold out</span>}
    </Link>
    <div className="product-info">
      <p className="product-category">{product.category}</p>
      <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
      <div className="product-meta">
        <p className="product-price">₹{Number(product.price).toFixed(2)}</p>
        <span>{product.stock > 0 ? "Available" : "Out of stock"}</span>
      </div>
    </div>
  </article>;
}
