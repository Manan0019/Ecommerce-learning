import { EntityTitle } from "../ui/index";
import { Link } from "react-router-dom";
import CategoryArtwork from "./CategoryArtwork";

/** The artwork is always contained in a consistent panel, even when admins use
 * mixed aspect ratios; later brand photography can be swapped without new CSS. */
export default function CategoryTile({ category, index = 0, directory = false }) {
  return <Link  className={`nx37-category-card nx37-category-tone-${index % 4}${directory ? " is-directory" : ""}`} to={`/categories/${encodeURIComponent(category.slug)}`} aria-label={`Browse ${category.name}`}>
    <div className="nx37-category-image"><CategoryArtwork category={category} /></div>
    <div className="nx37-category-details">
      <span className="nx37-category-kicker">COLLECTION {String(index + 1).padStart(2, "0")}</span>
      <EntityTitle as="h3" size="lg">{category.name}</EntityTitle>
      <div className="nx37-category-bottom"><span>{Number(category.productCount) > 0 ? `${category.productCount} products` : "Discover collection"}</span></div>
    </div>
  </Link>;
}
