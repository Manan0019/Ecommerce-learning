import { Link } from "react-router-dom";
import { apiAssetUrl } from "../../services/apiClient";

/** Compact category tile. Existing admin-uploaded category art is shown at a
 * controlled size, so large line-art icons no longer swallow the entire card.
 * Replace image assets later with consistent lifestyle/category photography.
 */
export default function CategoryTile({ category, index = 0, directory = false }) {
  return <Link className={`nx16-category-tile ${directory ? "nx16-category-directory-tile" : ""}`} to={`/categories/${encodeURIComponent(category.slug)}`}>
    <div className="nx16-category-copy">
      <span className="nx16-category-kicker">Collection {String(index + 1).padStart(2, "0")}</span>
      <h3>{category.name}</h3>
      <p>{category.productCount ?? 0} {(category.productCount ?? 0) === 1 ? "product style" : "product styles"}</p>
      <span className="nx16-category-explore">Explore collection <span aria-hidden="true">↗</span></span>
    </div>
    <div className="nx16-category-art" aria-hidden="true">
      {category.imageUrl ? <img src={apiAssetUrl(category.imageUrl)} alt="" loading="lazy" /> : <span>✳</span>}
    </div>
  </Link>;
}
