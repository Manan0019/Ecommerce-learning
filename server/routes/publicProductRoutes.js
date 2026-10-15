import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

// GET ALL PRODUCTS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         description,
         category,
         price,
         stock,
         image_url,
         created_at
       FROM products
       ORDER BY created_at DESC, id DESC
       LIMIT 100`
    );

    const products = result.rows.map((product) => ({
      id: String(product.id),
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock,
      imageUrl: product.image_url,
      createdAt: product.created_at
    }));

    res.json({ products });

  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      message: "Could not load products."
    });
  }
});

// GET SINGLE PRODUCT
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid product ID."
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         name,
         description,
         category,
         price,
         stock,
         image_url
       FROM products
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    const product = result.rows[0];

    res.json({
      product: {
        id: String(product.id),
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        stock: product.stock,
        imageUrl: product.image_url
      }
    });

  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      message: "Could not load product."
    });
  }
});

export default router;