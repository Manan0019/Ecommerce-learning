import { Navigate, useParams, useSearchParams } from "react-router-dom";

/** Older /edit links remain valid but use the shared modal on the admin product preview. */
export default function EditProduct() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const tab = ["details", "variants", "gallery"].includes(params.get("tab")) ? params.get("tab") : "details";
  return <Navigate replace to={`/admin/products/${encodeURIComponent(id)}/preview?edit=${tab}`}
    state={{ from: "/admin/products" }}/>
}
