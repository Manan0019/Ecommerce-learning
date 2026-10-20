import { useState } from "react";
import { apiAssetUrl } from "../../services/apiClient";

/** One consistent, non-overlapping artwork slot for categories and subcategories. */
export default function CategoryArtwork({ category, className = "" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = category?.imageUrl;
  return <span className={`nx34-category-artwork ${className}`.trim()} aria-hidden="true">
    {url && failedUrl !== url
      ? <img src={apiAssetUrl(url)} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />
      : <span className="nx34-category-letter">{(category?.name || "N").slice(0, 1).toUpperCase()}</span>}
  </span>;
}
