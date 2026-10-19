import { useContext } from "react";
import { BrandingContext } from "../context/brandingContext";
export function useBranding() {
  const value = useContext(BrandingContext);
  if (!value) throw new Error("useBranding must be used inside BrandingProvider");
  return value;
}
