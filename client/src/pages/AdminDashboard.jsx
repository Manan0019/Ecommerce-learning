import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const API = "http://localhost:4000";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const options = {
          credentials: "include",
          signal: controller.signal
        };

        const profileResponse = await fetch(
          `${API}/api/admin/me`,
          options
        );

        if (
          profileResponse.status === 401 ||
          profileResponse.status === 403
        ) {
          navigate("/admin/login", { replace: true });
          return;
        }

        if (!profileResponse.ok) {
          throw new Error("Could not load admin profile.");
        }

        const profileData = await profileResponse.json();

        const customersResponse = await fetch(
          `${API}/api/admin/customers`,
          options
        );

        if (
          customersResponse.status === 401 ||
          customersResponse.status === 403
        ) {
          navigate("/admin/login", { replace: true });
          return;
        }

        if (!customersResponse.ok) {
          throw new Error("Could not load customers.");
        }

        const customersData = await customersResponse.json();

        if (!controller.signal.aborted) {
          setAdmin(profileData.user);
          setCustomers(customersData.customers);
        }

      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }

      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [navigate]);

  async function handleLogout() {
    try {
      const response = await fetch(
        `${API}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      navigate("/admin/login", { replace: true });

    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>Loading admin dashboard...</p>;
  }

  if (error && !admin) {
    return <p role="alert">{error}</p>;
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome, {admin.fullName}</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      {error && <p role="alert">{error}</p>}

      <section className="admin-section">
        <h2>Registered Customers</h2>

        <p>Showing {customers.length} recent customers (maximum 100).</p>

        <Link to="/admin/products/new">Add New Product</Link>

        <Link to="/admin/products">Manage Products</Link>

        <div className="table-wrapper">
          <table className="customer-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Registered On</th>
              </tr>
            </thead>

            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="4">No registered customers yet.</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.id}</td>
                    <td>{customer.fullName}</td>
                    <td>{customer.email}</td>
                    <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}