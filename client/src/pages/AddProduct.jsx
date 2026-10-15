import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function AddProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    stock: ""
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const formRef = useRef(null);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!image) {
      setMessage("Please select a product image.");
      return;
    }

    const formData = new FormData();

    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("category", form.category);
    formData.append("price", form.price);
    formData.append("stock", form.stock);
    formData.append("image", image);

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:4000/api/admin/products",
        {
          method: "POST",
          credentials: "include",
          body: formData
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned HTTP ${response.status}: ${responseText.slice(0, 150)}`,
        );
      }

      if (response.status === 401 ||
          response.status === 403) {
        navigate("/admin/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Product creation failed."
        );
      }

      setMessage("Product created successfully!");

      setForm({
        name: "",
        description: "",
        category: "",
        price: "",
        stock: ""
      });

      setImage(null);
      formRef.current?.reset();

    } catch (error) {
      setMessage(error.message);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <Link to="/admin/dashboard">
        Back to Dashboard
      </Link>

      <h1>Add New Product</h1>

      <form ref={formRef} onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Product name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Product description"
          value={form.description}
          onChange={handleChange}
          required
        />

        <input
          name="category"
          placeholder="Category"
          value={form.category}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Price in ₹"
          min="0.01"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="stock"
          placeholder="Stock quantity"
          min="0"
          step="1"
          value={form.stock}
          onChange={handleChange}
          required
        />

        <label htmlFor="product-image">
          Product Image
        </label>

        <input
          id="product-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            setImage(event.target.files?.[0] || null)
          }
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}
    </div>
  );
}