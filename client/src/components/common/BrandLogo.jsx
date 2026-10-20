import { useState } from "react";
import { SITE_NAME } from "../../config/site";
import { apiAssetUrl } from "../../services/apiClient";
import { useBranding } from "../../hooks/useBranding";

// Global brand = interchangeable symbol + permanent Nexora wordmark.
// The symbol image is decorative: nearby real text is the accessible name.
export default function BrandLogo({ markClassName = "brand-mark", className = "", showAdminLabel = false, showIcon = true }) {
  const { iconUrl } = useBranding();
  const [failedUrl, setFailedUrl] = useState(null);
  const imageAvailable = iconUrl && failedUrl !== iconUrl;
  return <span className={`nx27-brand-combo ${className}`.trim()}>
    {showIcon && (imageAvailable
      ? <span className="nx27-brand-symbol"><img src={apiAssetUrl(iconUrl)} alt="" onError={() => setFailedUrl(iconUrl)} /></span>
      : <span className={markClassName} aria-hidden="true">{SITE_NAME.charAt(0).toUpperCase()}</span>)}
    <span className="nx27-brand-name-group">
      <strong className="nx27-brand-name">{SITE_NAME}</strong>
      {showAdminLabel && <small className="nx27-brand-admin-label">Administration</small>}
    </span>
  </span>;
}
