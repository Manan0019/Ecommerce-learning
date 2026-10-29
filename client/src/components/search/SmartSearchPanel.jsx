import { Link } from 'react-router-dom';
import UiIcon from '../common/UiIcon';
import CategoryMiniArtwork from '../customer/CategoryMiniArtwork';
import { Button, EntitySubtitle, EntityTitle } from '../ui/index';
import { apiAssetUrl } from '../../services/apiClient';

/** Storefront search discovery, composed from Nexora's existing UI primitives. */
export default function SmartSearchPanel({ query, loading, suggestions, recent, categoryArtwork, onRecent,
  onClearRecent, onChoose, onSearchAll, panelRef }) {
  const clean = query.trim();
  const discovery = clean.length === 0;
  // Keep the first discovery view concise. Customers can browse the full catalogue via the footer.
  const categories = (suggestions.categories || []).slice(0, discovery ? 3 : 4);
  const products = (suggestions.products || []).slice(0, discovery ? 2 : 5);
  return <div ref={panelRef} className="nx-search-suggestions nx-smart-search" id="nx-search-suggestions" role="region"
    aria-label={discovery ? 'Search discovery' : 'Search suggestions'}>
    <div className="nx-smart-body">
      {discovery && recent.length > 0 && <section className="nx-smart-group" aria-label="Recent searches">
        <div className="nx-smart-group-heading">
          <strong>Recent searches</strong>
          <Button type="button" variant="ghost" size="sm" className="nx-smart-clear-history" onClick={onClearRecent}>
            <UiIcon name="x" size={13}/><span>Clear history</span>
          </Button>
        </div>
        <div className="nx-smart-recents">{recent.map(item => <Button key={item} type="button" variant="secondary"
          size="sm" className="nx-smart-recent" onClick={() => onRecent(item)}>
          <UiIcon name="search" size={14}/><span>{item}</span>
        </Button>)}</div>
      </section>}
      {loading && <p className="nx-search-empty" role="status">Finding matches…</p>}
      {!loading && categories.length > 0 && <section className="nx-search-group" aria-label="Matching categories">
        <span>{discovery ? 'Explore categories' : 'Categories'}</span>
        {categories.map(category => <Link key={category.id} onClick={onChoose} to={`/categories/${encodeURIComponent(category.slug)}`}>
          <CategoryMiniArtwork category={categoryArtwork[category.slug] || category} className="nx49-search-category-icon"/>
          <span className="nx47-search-category">{category.name}<small>Collection</small></span>
          <UiIcon name="chevron-right" size={15}/>
        </Link>)}
      </section>}
      {!loading && products.length > 0 && <section className="nx-search-group" aria-label="Matching products">
        <span>{discovery ? 'Featured picks' : 'Products & similar matches'}</span>
        {products.map(product => <EntityTitle as={Link} key={product.cardKey || product.id}
          to={`/products/${product.id}${product.selectedVariantId ? `?variant=${encodeURIComponent(product.selectedVariantId)}` : ''}`} onClick={onChoose}>
          {product.imageUrl ? <img src={apiAssetUrl(product.imageUrl)} alt="" loading="lazy"/>
            : <span className="nx-search-placeholder"><UiIcon name="bag" size={18}/></span>}
          <span className="nx-search-result-label"><span className="nx-search-product-name">{product.name}</span><EntitySubtitle>{product.brand || product.category}</EntitySubtitle></span>
          <UiIcon name="chevron-right" size={15}/>
        </EntityTitle>)}
      </section>}
      {!loading && !discovery && !products.length && !categories.length && <p className="nx-search-empty">No close matches. Try another product or brand.</p>}
    </div>
    <div className="nx-smart-footer">
      <Button variant="secondary" type="button" className="nx-search-view-all" onClick={onSearchAll}>
        <span>{discovery ? 'Browse all products' : `View all results for “${clean}”`}</span>
        <UiIcon name="right" size={16}/>
      </Button>
    </div>
  </div>;
}
