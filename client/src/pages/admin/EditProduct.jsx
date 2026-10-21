import { Link, useParams, useSearchParams } from "react-router-dom";
import UiIcon from "../../components/common/UiIcon";
import AdminLayout from "../../components/layout/AdminLayout";
import ProductEditorWorkspace from "../../components/admin/ProductEditorWorkspace";

export default function EditProduct() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const tab = ["details","variants","gallery"].includes(params.get("tab")) ? params.get("tab") : "details";
  return <AdminLayout title="Edit Product" subtitle="Make quick changes in dedicated tabs—no long scrolling required."
    actions={<Link className="admin-secondary-action" to="/admin/products"><UiIcon name="left" size={17}/> All products</Link>}>
    <ProductEditorWorkspace key={`${id}-${tab}`} productId={id} initialTab={tab}/>
  </AdminLayout>;
}
