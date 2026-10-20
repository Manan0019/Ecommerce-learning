import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Restore the viewport on actual navigation; sorting/filter URL changes on
 * the same listing retain position to avoid jarring the shopper. */
export default function RouteExperience() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
