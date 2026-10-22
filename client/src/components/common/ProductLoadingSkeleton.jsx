/** Rendered only while a real catalogue request is pending. */
export default function ProductLoadingSkeleton(){
 return <div className="product-skeleton nx64-product-skeleton" aria-hidden="true">
  <div className="nx64-skeleton-shape nx64-skeleton-photo" />
  <div className="nx64-skeleton-shape nx64-skeleton-category" />
  <div className="nx64-skeleton-shape nx64-skeleton-title" />
  <div className="nx64-skeleton-shape nx64-skeleton-title short" />
  <div className="nx64-skeleton-shape nx64-skeleton-price" />
  <div className="nx64-skeleton-shape nx65-skeleton-action" />
 </div>;
}
