import { useCallback, useEffect, useState } from "react";
import { BrandingContext } from "./brandingContext";
import { getBranding } from "../services/brandingService";
import { apiAssetUrl } from "../services/apiClient";
import { SITE_NAME } from "../config/site";

function browserIconUrl(iconUrl, faviconOverrideUrl) {
  return faviconOverrideUrl || iconUrl || null;
}

export default function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ iconUrl: null, faviconOverrideUrl: null });
  const refreshBranding = useCallback(async (signal) => {
    try {
      const info = await getBranding(signal);
      if (!signal?.aborted) setBranding({
        iconUrl: info.iconUrl || null,
        faviconOverrideUrl: info.faviconOverrideUrl || null
      });
    } catch (error) {
      if (error.name !== "AbortError") console.warn("Branding unavailable; using default mark.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshBranding(controller.signal);
    const onFocus = () => refreshBranding(controller.signal);
    window.addEventListener("focus", onFocus);
    return () => { controller.abort(); window.removeEventListener("focus", onFocus); };
  }, [refreshBranding]);

  useEffect(() => {
    document.title = `${SITE_NAME} | Discover more`;
    const chosen = browserIconUrl(branding.iconUrl, branding.faviconOverrideUrl);
    const href = chosen ? apiAssetUrl(chosen) : "/favicon.svg";
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
    icon.href = href;
    icon.type = chosen ? (chosen.endsWith(".png") ? "image/png" : "image/webp") : "image/svg+xml";
    // Apple touch icons should use PNG instead of relying on WebP compatibility.
    let apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (branding.faviconOverrideUrl?.endsWith(".png")) {
      if (!apple) { apple = document.createElement("link"); apple.rel = "apple-touch-icon"; document.head.appendChild(apple); }
      apple.href = apiAssetUrl(branding.faviconOverrideUrl);
    } else if (apple) apple.remove();
  }, [branding.iconUrl, branding.faviconOverrideUrl]);

  return <BrandingContext.Provider value={{
    iconUrl: branding.iconUrl, logoUrl: branding.iconUrl,
    faviconOverrideUrl: branding.faviconOverrideUrl,
    faviconUrl: browserIconUrl(branding.iconUrl, branding.faviconOverrideUrl),
    refreshBranding
  }}>{children}</BrandingContext.Provider>;
}
