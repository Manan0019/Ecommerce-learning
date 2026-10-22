import { Link } from "react-router-dom";
import UiIcon from "../common/UiIcon";
import CategoryArtwork from "./CategoryArtwork";

/** The artwork is always contained in a consistent panel, even when admins use
 * mixed aspect ratios; later brand photography can be swapped without new CSS. */
export default function CategoryTile({ category, index = 0, directory = false }) {
  return <Link className={`nx37-category-card nx37-category-tone-${index % 4}${directory ? " is-directory" : ""}`} to={`/categories/${encodeURIComponent(category.slug)}`} aria-label={`Browse ${category.name}`}>
    <div className="nx37-category-image"><CategoryArtwork category={category} /></div>
    <div className="nx37-category-details">
      <span className="nx37-category-kicker">COLLECTION {String(index + 1).padStart(2, "0")}</span>
      <h3>{category.name}</h3>
      <div className="nx37-category-bottom"><span>{Number(category.productCount) > 0 ? `${category.productCount} products` : "Discover collection"}</span><span className="nx37-category-arrow" aria-hidden="true"><UiIcon name="chevron-right" size={19}/></span></div>
    </div>
  </Link>;
}
