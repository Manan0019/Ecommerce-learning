import { useState } from "react";
import { apiAssetUrl } from "../../services/apiClient";

/** Small, database-backed category artwork. Prefer the dedicated admin-uploaded
 * menu icon, falling back to the category cover and then a readable initial. */
export default function CategoryMiniArtwork({ category, className = "" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = category?.menuIconUrl || category?.imageUrl || null;
  return <span className={`nx49-category-mini ${className}`.trim()} aria-hidden="true">
    {url && url !== failedUrl
      ? <img src={apiAssetUrl(url)} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />
      : <span className="nx49-category-initial">{(category?.name || "C").trim().slice(0, 1).toUpperCase()}</span>}
  </span>;
}
