import useRealtimeRevision from "./useRealtimeRevision";
import { useEffect, useState } from "react";
import { getCategories } from "../services/categoryService";

export function useActiveCategories() {
  const liveRevision=useRealtimeRevision(["catalog"]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadCategories() {
      try {
        const data = await getCategories(controller.signal);
        if (!controller.signal.aborted) setCategories(data.categories);
      } catch (error) {
        if (error.name !== "AbortError") setCategoriesError(error.message);
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      }
    }
    loadCategories();
    return () => controller.abort();
  }, [liveRevision]);

  return { categories, categoriesLoading, categoriesError };
}
