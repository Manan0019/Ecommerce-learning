import { useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { Button, IconButton } from "../ui/index";
import UiIcon from "../common/UiIcon";
import { readCompareIds, saveCompareProduct } from "../../services/compareStorage";

function subscribeToComparisons(onChange) {
  window.addEventListener("nexora:compare-changed", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("nexora:compare-changed", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Shared comparison action for catalogue cards and product details. */
export default function CompareProductButton({ product, compact = false, onResult }) {
  const productId = String(product.parentProductId || product.id);
  const selected = useSyncExternalStore(
    subscribeToComparisons,
    () => readCompareIds().some(id => String(id) === productId),
    () => false,
  );
  const [feedback, setFeedback] = useState("");

  function addToComparison() {
    const result = saveCompareProduct(product);
    if (onResult) onResult(result);
    else setFeedback(result);
  }

  const label = selected ? "Already in comparison" : "Compare product";
  if (compact) return (
    <IconButton variant="secondary" type="button" title={label}
      aria-label={`${label}: ${product.name}`} aria-pressed={selected}
      onClick={addToComparison}>
      <UiIcon name="compare" size={18} />
    </IconButton>
  );

  return <span className="nx-detail-compare-action">
    <Button variant="secondary" type="button" aria-pressed={selected}
      onClick={addToComparison} title={label}>
      <UiIcon name="compare" size={18} />
      {selected ? "In comparison" : "Compare product"}
    </Button>
    {selected && <Link className="nx-detail-compare-link" to="/compare">View comparison</Link>}
    {feedback && feedback !== "Added to compare" && feedback !== "Already in compare" &&
      <small className="nx-detail-compare-feedback" role="status">{feedback} <Link to="/compare">Manage comparison</Link></small>}
  </span>;
}
