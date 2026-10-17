import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import {
  createProduct,
  addProductImage,
  addProductVideo,
  updateFeatured,
} from "../../services/productService";
import ProductMediaManager from "../../components/admin/ProductMediaManager";
import ProductVariantsManager from "../../components/admin/ProductVariantsManager";
import DraftVariants from "../../components/admin/DraftVariants";
import { validateVariantDrafts } from "../../components/admin/variantDraftValidation";
import { createVariant } from "../../services/variantService";
import { isAuthenticationError } from "../../services/apiClient";
import { useActiveCategories } from "../../hooks/useActiveCategories";
import { useSpecificationDefinition } from "../../hooks/useSpecificationDefinition";
import ProductSpecificationFields from "../../components/admin/ProductSpecificationFields";

export default function AddProduct() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { categories, categoriesLoading, categoriesError } =
    useActiveCategories();
  const [form, setForm] = useState({
    name: "",
    brand: "",
    model: "",
    description: "",
    categoryId: "",
    price: "",
    stock: "",
  });
  const [specifications, setSpecifications] = useState({});
  const specification = useSpecificationDefinition(form.categoryId);
  const [image, setImage] = useState(null);
  const [queuedMedia, setQueuedMedia] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  const [variantDrafts, setVariantDrafts] = useState([]);
  const [variantFailures, setVariantFailures] = useState([]);
  const [uploadReport, setUploadReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "categoryId") setSpecifications({});
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function updateSpecification(key, value) {
    setSpecifications((previous) => ({ ...previous, [key]: value }));
  }

  function queueImages(event) {
    const files = [...(event.target.files || [])];
    setQueuedMedia((previous) =>
      [
        ...previous,
        ...files
          .filter((file) =>
            ["image/png", "image/jpeg", "image/webp"].includes(file.type),
          )
          .map((file) => ({ key: crypto.randomUUID(), type: "image", file })),
      ].slice(0, 15),
    );
    event.target.value = "";
  }

  function queueVideo() {
    const value = videoUrl.trim();
    if (
      !/^https:\/\/(?:www\.|m\.)?youtube\.com\/|^https:\/\/youtu\.be\//i.test(
        value,
      )
    ) {
      setMessage("Use a YouTube video URL with HTTPS.");
      return;
    }
    setQueuedMedia((previous) =>
      previous.length < 15
        ? [
            ...previous,
            { key: crypto.randomUUID(), type: "youtube", url: value },
          ]
        : previous,
    );
    setVideoUrl("");
    setMessage("");
  }

  function moveQueued(index, change) {
    setQueuedMedia((previous) => {
      const destination = index + change;
      if (destination < 0 || destination >= previous.length) return previous;
      const result = [...previous];
      [result[index], result[destination]] = [
        result[destination],
        result[index],
      ];
      return result;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    let validVariants;
    try {
      validVariants = validateVariantDrafts(variantDrafts);
    } catch (validationError) {
      setMessage(validationError.message);
      return;
    }
    if (!image) {
      setMessage("Please select a product image.");
      return;
    }
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append("specifications", JSON.stringify(specifications));
    formData.append("image", image);
    setLoading(true);
    setMessage("");
    try {
      const result = await createProduct(formData);
      const created = result.product;
      setCreatedProduct(created);
      const failures = [];
      const unsaved = [];
      for (const draft of validVariants) {
        try {
          await createVariant(created.id, {
            sku: draft.sku.trim(),
            attributes: draft.attributes,
            price: draft.price,
            stock: Number(draft.stock),
            isActive: draft.isActive,
          });
        } catch (variantError) {
          unsaved.push({ ...draft, error: variantError.message });
          failures.push(`SKU ${draft.sku}: ${variantError.message}`);
        }
      }
      setVariantFailures(unsaved);
      for (const [index, item] of queuedMedia.entries()) {
        try {
          if (item.type === "image")
            await addProductImage(created.id, item.file);
          else await addProductVideo(created.id, item.url);
        } catch (uploadError) {
          failures.push(`Item ${index + 1}: ${uploadError.message}`);
        }
      }
      if (featured) {
        try {
          await updateFeatured(created.id, true);
        } catch (featuredError) {
          failures.push(`Featured: ${featuredError.message}`);
        }
      }
      setUploadReport(
        failures.length
          ? `Product saved (#${created.id}), but some media/settings failed: ${failures.join("; ")}. Use the manager below to retry.`
          : `Product #${created.id} created with ${queuedMedia.length + 1} gallery item(s).`,
      );
      setMessage("");
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate("/login", { replace: true });
        return;
      }
      setMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout
      title="Add Product"
      subtitle="Create a product with its gallery, videos and featured status."
      actions={
        <Link className="admin-secondary-action" to="/admin/products">
          Cancel
        </Link>
      }
    >
      {createdProduct ? (
        <section className="admin-panel admin-form-panel">
          <h2>Product saved</h2>
          <p role="status">{uploadReport}</p>
          <p>
            The gallery below is connected to the saved product. You can add
            more images, videos or change their order.
          </p>
          <ProductMediaManager
            productId={createdProduct.id}
            initialFeatured={Boolean(featured)}
          />
          <ProductVariantsManager productId={createdProduct.id} />
          {variantFailures.length > 0 && (
            <section className="admin-panel" aria-label="Failed variants">
              <h3>Some variants could not be saved</h3>
              <p role="alert">
                The product is saved. The following SKUs need correction. Use
                the variant manager above or open Edit Product; do not create
                the parent product again.
              </p>
              <ul>
                {variantFailures.map((v) => (
                  <li key={v.key}>
                    {v.sku}: {v.error}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="admin-form-actions">
            <Link
              className="admin-secondary-action"
              to={`/admin/products/${createdProduct.id}/edit`}
            >
              Edit product details
            </Link>
            <button
              type="button"
              className="admin-primary-action"
              onClick={() => {
                setCreatedProduct(null);
                setQueuedMedia([]);
                setFeatured(false);
                setUploadReport("");
                setVariantDrafts([]);
                setVariantFailures([]);
                setForm({
                  name: "",
                  brand: "",
                  model: "",
                  description: "",
                  categoryId: "",
                  price: "",
                  stock: "",
                });
                setSpecifications({});
                setImage(null);
                formRef.current?.reset();
              }}
            >
              Create another product
            </button>
          </div>
        </section>
      ) : (
        <section className="admin-panel admin-form-panel">
          <form className="admin-form" ref={formRef} onSubmit={handleSubmit}>
            <label>
              Product name
              <input
                name="name"
                placeholder="Product name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <div className="admin-form-grid two-column">
              <label>
                Brand
                <input
                  name="brand"
                  placeholder="Brand"
                  value={form.brand}
                  onChange={handleChange}
                  maxLength={80}
                />
              </label>
              <label>
                Model
                <input
                  name="model"
                  placeholder="Model number or family"
                  value={form.model}
                  onChange={handleChange}
                  maxLength={120}
                />
              </label>
            </div>
            <label>
              Description
              <textarea
                name="description"
                placeholder="Product description"
                value={form.description}
                onChange={handleChange}
                required
              />
            </label>
            <div className="admin-form-grid">
              <label>
                Category
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  disabled={categoriesLoading || categories.length === 0}
                  required
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories…"
                      : "Select a category"}
                  </option>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Price (₹)
                <input
                  type="number"
                  name="price"
                  placeholder="Price"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Stock
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
              </label>
            </div>
            <DraftVariants
              variants={variantDrafts}
              onChange={setVariantDrafts}
              disabled={loading}
            />
            <ProductSpecificationFields
              definition={specification.definition}
              specifications={specifications}
              onChange={updateSpecification}
              loading={specification.loading}
            />
            {specification.error && (
              <p className="admin-alert" role="alert">
                {specification.error}
              </p>
            )}
            <label>
              Product image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
                required
              />
            </label>
            <section
              className="admin-media-draft"
              aria-label="New product gallery"
            >
              <h2>Gallery and videos</h2>
              <p>
                The primary image above is the initial cover. Queue up to 15
                more images/videos; adjust their order before saving.
              </p>
              <label>
                Additional gallery images (JPG, PNG, WebP; 5 MB each)
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={queueImages}
                />
              </label>
              <label>
                YouTube video URL
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </label>
              <button
                type="button"
                onClick={queueVideo}
                disabled={
                  loading || !videoUrl.trim() || queuedMedia.length >= 15
                }
              >
                Queue video
              </button>
              <label className="admin-featured-toggle">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />{" "}
                Feature this product on the homepage
              </label>
              <ol className="media-manager-list">
                {queuedMedia.map((item, index) => (
                  <li className="media-manager-item" key={item.key}>
                    <span>
                      {index + 2}.{" "}
                      {item.type === "image" ? item.file.name : item.url}
                    </span>
                    <button
                      type="button"
                      disabled={index === 0 || loading}
                      onClick={() => moveQueued(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === queuedMedia.length - 1 || loading}
                      onClick={() => moveQueued(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setQueuedMedia((previous) =>
                          previous.filter(
                            (candidate) => candidate.key !== item.key,
                          ),
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            <button
              className="admin-primary-action"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating…" : "Create Product"}
            </button>
          </form>
          {message && (
            <p className="admin-form-message" role="status">
              {message}
            </p>
          )}
          {categoriesError && (
            <p className="admin-alert" role="alert">
              {categoriesError}
            </p>
          )}
          {!categoriesLoading && categories.length === 0 && (
            <p className="admin-alert">
              Create an active category before adding products.
            </p>
          )}
        </section>
      )}
    </AdminLayout>
  );
}
