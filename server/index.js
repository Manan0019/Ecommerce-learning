import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import { sessionMiddleware } from "./config/session.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import productRoutes from "./routes/productRoutes.js";
import publicProductRoutes from "./routes/publicProductRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.use(sessionMiddleware);

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use(
  "/uploads/products",
  express.static(path.join(__dirname, "uploads/products")),
);

app.use("/api/admin/products", productRoutes);

app.use("/api/products", publicProductRoutes);


app.get("/", (req, res) => {
  res.json({
    message: "Ecommerce API is running"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS database_time"
    );

    res.json({
      success: true,
      message: "PostgreSQL connected successfully",
      databaseTime: result.rows[0].database_time
    });

  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connection verified");

    app.listen(PORT, () => {
      console.log(`Express running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Startup database check failed:", error);
    process.exitCode = 1;
    await pool.end();
  }
}

startServer();
