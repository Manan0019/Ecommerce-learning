import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const API = "http://localhost:4000";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        const response = await fetch(`${API}/api/admin/products`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          navigate("/admin/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load product.");
        }

        const data = await response.json();
        const product = data.products.find((p) => p.id === id);

        if (!product) {
          throw new Error("Product not found in current list.");
        }

        setForm({
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          stock: String(product.stock),
        });
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

    loadProduct();

    return () => controller.abort();
  }, [id, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/admin/products/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          stock: Number(form.stock),
        }),
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Product update failed.");
      }

      navigate("/admin/products", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading product...</p>;
  if (!form) return <p role="alert">{error}</p>;

  async function handleImageUpload(event) {
    event.preventDefault();

    if (!newImage) {
      setImageMessage("Select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", newImage);

    setUploadingImage(true);
    setImageMessage("");

    try {
      const response = await fetch(`${API}/api/admin/products/${id}/image`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      setImageMessage("Image updated successfully.");
      setNewImage(null);
    } catch (err) {
      setImageMessage(err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="auth-container">
      <Link to="/admin/products">Back to Products</Link>

      <h2>Replace Product Image</h2>

      <form onSubmit={handleImageUpload}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setNewImage(event.target.files?.[0] || null)}
          required
        />

        <button type="submit" disabled={uploadingImage}>
          {uploadingImage ? "Uploading..." : "Replace Image"}
        </button>
      </form>

      {imageMessage && <p role="status">{imageMessage}</p>}

      <h1>Edit Product</h1>

      <form onSubmit={handleSubmit}>
        <input name="name" value={form.name} onChange={handleChange} required />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
        />

        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        />

        <input
          name="price"
          type="number"
          min="0.01"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          required
        />

        <input
          name="stock"
          type="number"
          min="0"
          step="1"
          value={form.stock}
          onChange={handleChange}
          required
        />

        <button disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
    </div>
  );
}
