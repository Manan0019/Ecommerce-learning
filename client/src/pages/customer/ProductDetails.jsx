import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { apiAssetUrl } from "../../services/apiClient";
import { getProduct } from "../../services/productService";
import { useCart } from "../../hooks/useCart";

export default function ProductDetails() {
  const { id } = useParams();
  return <ProductDetailsContent key={id} id={id} />;
}

function ProductDetailsContent({ id }) {
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProduct() {
      try {
        const data = await getProduct(id, controller.signal);
        setProduct(data.product);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProduct();
    return () => controller.abort();
  }, [id]);

  function addProduct() {
    addToCart(product.id, quantity);
    setAdded(true);
  }

  return <CustomerLayout mainClassName="product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/products">Shop</Link>
        {product && <><span aria-hidden="true">/</span><span>{product.name}</span></>}
      </nav>
      {loading && <div className="detail-skeleton" aria-label="Loading product" />}
      {error && <p role="alert" className="store-alert">{error}</p>}
      {product && <article className="product-detail">
        <div className="product-detail-media">
          {product.imageUrl
            ? <img src={apiAssetUrl(product.imageUrl)} alt={product.name} />
            : <div className="missing-image">Image coming soon</div>}
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">₹{Number(product.price).toFixed(2)}</p>
          <p className="detail-description">{product.description}</p>
          <div className={`stock-status ${product.stock > 0 ? "in-stock" : "out-of-stock"}`}>
            <span />{product.stock > 0 ? `${product.stock} available` : "Currently unavailable"}
          </div>
          <div className="purchase-panel">
            <label htmlFor="product-quantity">Quantity</label>
            <div className="purchase-row">
              <div className="quantity-picker">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <input id="product-quantity" type="number" min="1" max={Math.min(99, product.stock)}
                  value={quantity} disabled={product.stock === 0}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isInteger(next) && next >= 1 && next <= Math.min(99, product.stock)) setQuantity(next);
                  }} />
                <button type="button" aria-label="Increase quantity"
                  disabled={product.stock === 0 || quantity >= Math.min(99, product.stock)}
                  onClick={() => setQuantity((value) => Math.min(product.stock, 99, value + 1))}>+</button>
              </div>
              <button className="button button-primary add-cart-button" type="button"
                disabled={product.stock === 0} onClick={addProduct}>
                {product.stock === 0 ? "Out of stock" : "Add to cart"}
              </button>
            </div>
            {added && <p className="added-message" role="status">Added to your cart. <Link to="/cart">View cart →</Link></p>}
          </div>
          <ul className="product-assurances">
            <li><span>✓</span> Secure customer session</li>
            <li><span>✓</span> Live price and stock</li>
            <li><span>✓</span> Carefully selected quality</li>
          </ul>
        </div>
      </article>}
  </CustomerLayout>;
}
