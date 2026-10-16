import { useEffect, useState } from "react";
import { getAdminSpecificationDefinition } from "../services/categoryService";

export function useSpecificationDefinition(categoryId) {
  const [result, setResult] = useState({ categoryId: null, definition: null, error: "" });

  useEffect(() => {
    if (!categoryId) return undefined;
    const controller = new AbortController();
    getAdminSpecificationDefinition(categoryId, controller.signal)
      .then((data) => setResult({ categoryId, definition: data.definition, error: "" }))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setResult({ categoryId, definition: null, error: requestError.message });
        }
      });
    return () => controller.abort();
  }, [categoryId]);

  const current = result.categoryId === categoryId
    ? result
    : { definition: null, error: "" };
  return {
    definition: current.definition,
    error: current.error,
    loading: Boolean(categoryId) && result.categoryId !== categoryId
  };
}
