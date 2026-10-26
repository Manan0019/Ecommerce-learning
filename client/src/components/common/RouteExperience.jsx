import { useEffect, useRef } from "react";
import { installFilterScrollProtection, cancelFilterScrollPreservation } from '../../services/filterScrollProtection';
import { useLocation } from "react-router-dom";

/** Restore the viewport on actual navigation; sorting/filter URL changes on
 * the same listing retain position to avoid jarring the shopper. */
export default function RouteExperience() {
  const { pathname, state } = useLocation();
  const previous = useRef(null);
  useEffect(() => installFilterScrollProtection(), []);
  useEffect(() => {
    const last = previous.current;
    previous.current = pathname;
    // Browsing neighboring category/subcategory pages should not bounce to
    // the page top while their banner and product data are still settling.
    const withinCatalogue = last && /^(\/categories\/|\/products$)/.test(last) && /^(\/categories\/|\/products$)/.test(pathname);
    // Admin navigation is client-side: do not reset its workspace or sidebar scroll.
    // Only transitions into/out of admin reset the viewport.
    if (state?.preserveScroll === true) return;
    if (last?.startsWith("/admin") && pathname.startsWith("/admin")) return;
    if (!withinCatalogue) {
      cancelFilterScrollPreservation();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, state]);
  return null;
}
