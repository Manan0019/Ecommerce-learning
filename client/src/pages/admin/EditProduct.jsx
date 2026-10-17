import { Link, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import ProductEditorWorkspace from "../../components/admin/ProductEditorWorkspace";

export default function EditProduct() {
  const { id } = useParams();
  return <AdminLayout title="Edit Product" subtitle="Make quick changes in dedicated tabs—no long scrolling required."
    actions={<Link className="admin-secondary-action" to="/admin/products">← All products</Link>}>
    <ProductEditorWorkspace key={id} productId={id}/>
  </AdminLayout>;
}
