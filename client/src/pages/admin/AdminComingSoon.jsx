import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminComingSoon({ title }) {
  return <AdminLayout title={title} subtitle="This area is reserved for a future administration feature.">
    <section className="admin-coming-soon">
      <span aria-hidden="true">◇</span>
      <p className="admin-eyebrow">Coming soon</p>
      <h2>{title} is not implemented yet.</h2>
      <p>No data is displayed here until the required backend functionality exists.</p>
    </section>
  </AdminLayout>;
}
