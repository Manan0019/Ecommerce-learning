import assert from "node:assert/strict";
import { after, test } from "node:test";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import pool from "../config/db.js";
import authRoutes from "../routes/authRoutes.js";
import adminRoutes from "../routes/adminRoutes.js";
import productRoutes from "../routes/productRoutes.js";
import categoryRoutes from "../routes/categoryRoutes.js";
import { requireCustomer } from "../middleware/authMiddleware.js";

process.env.NODE_ENV = "test";

// Real HTTP, bcrypt and Express sessions; fixture users never touch the database.
// AUTH_TEST_POSTGRES=1 additionally exercises the configured PostgreSQL session store.
const postgres = process.env.AUTH_TEST_POSTGRES === "1";
const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);
const hash = await bcrypt.hash("test-password-123", 4);
const users = [
  { id: "1", full_name: "Customer", email: "customer@example.test", mobile_number: "+919876543210", profile_image_url: "/uploads/profiles/test.webp", role: "customer", password_hash: hash },
  { id: "2", full_name: "Admin", email: "admin@example.test", mobile_number: null, profile_image_url: null, role: "admin", password_hash: hash },
  { id: "3", full_name: "Unknown", email: "unknown@example.test", role: "unknown", password_hash: hash }
];
let savedPendingRegistration = null;
pool.query = async (sql, values) => {
  if (sql.includes("UPDATE users SET full_name")) {
    const user = users.find(u => u.id === values[1] && u.role === "customer");
    if (user) user.full_name = values[0];
    return { rows: user ? [user] : [] };
  }
  if (sql.includes("UPDATE users SET password_hash")) {
    const user = users.find(u => u.id === values[1] && u.role === "customer");
    if (user) user.password_hash = values[0];
    return { rows: [] };
  }
  if (sql.includes("FROM pending_registrations")) return { rows: [] };
  if (sql.includes("INSERT INTO pending_registrations")) {
    savedPendingRegistration = {
      fullName: values[0], email: values[1], mobileNumber: values[2],
      profileImageUrl: values[3], passwordHash: values[4]
    };
    return { rows: [] };
  }
  if (sql.includes("FROM users")) {
    const user = sql.includes("LOWER(email)")
      ? users.find(u => u.email === values[0])
      : users.find(u => u.id === values[0]);
    return { rows: user ? [user] : [] };
  }
  if (postgres) return originalQuery(sql, values);
  throw new Error("Unexpected query in isolated auth test");
};
const app = express();
app.use(express.json());
let store;
if (postgres) {
  const { sessionMiddleware } = await import("../config/session.js");
  app.use(sessionMiddleware);
} else {
  store = new session.MemoryStore();
  app.use(session({ store, name: "ecommerce.sid", secret: "isolated-test-secret", resave: false, saveUninitialized: false }));
}
app.use("/api/auth", authRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.get("/customer-only", requireCustomer, (_req, res) => res.json({ ok: true }));
const server = app.listen(0, "127.0.0.1");
await new Promise(resolve => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function request(path, { cookie, body, method } = {}) {
  const response = await fetch(base + path, {
    method: method || (body ? "POST" : "GET"),
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
const login = (email, cookie, password = "test-password-123", path = "/api/auth/login") =>
  request(path, { cookie, body: { email, password, role: "admin" } });
after(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  pool.query = originalQuery;
  pool.connect = originalConnect;
  await pool.end();
});

test("unified login, persisted identity, session rotation, role boundaries and logout", async () => {
  assert.equal((await request("/api/auth/me")).status, 401);
  const customer = await login("  CUSTOMER@example.test  ");
  assert.equal(customer.status, 200);
  assert.deepEqual(customer.data.user, {
    id: "1", fullName: "Customer", email: "customer@example.test",
    mobileNumber: "+919876543210",
    role: "customer"
  });
  assert.ok(customer.cookie);
  const admin = await login("admin@example.test", customer.cookie);
  assert.equal(admin.status, 200);
  assert.equal(admin.data.user.role, "admin");
  assert.notEqual(admin.cookie, customer.cookie);
  try {
    assert.equal((await request("/api/auth/me", { cookie: customer.cookie })).status, 401);
    assert.deepEqual((await request("/api/auth/me", { cookie: admin.cookie })).data.user, admin.data.user);
    assert.equal((await request("/api/admin/me", { cookie: admin.cookie })).status, 200);
    assert.equal((await request("/customer-only", { cookie: admin.cookie })).status, 403);
  } finally {
    assert.equal((await request("/api/auth/logout", { cookie: admin.cookie, method: "POST" })).status, 200);
  }
  assert.equal((await request("/api/auth/me", { cookie: admin.cookie })).status, 401);
  const customerAgain = await login("customer@example.test");
  try {
    assert.equal((await request("/api/auth/me", { cookie: customerAgain.cookie })).data.user.role, "customer");
    assert.equal((await request("/customer-only", { cookie: customerAgain.cookie })).status, 200);
    for (const path of ["/api/admin/me", "/api/admin/customers", "/api/admin/products", "/api/admin/products/1", "/api/admin/categories", "/api/admin/categories/1/specifications"]) {
      assert.equal((await request(path, { cookie: customerAgain.cookie })).status, 403);
    }
    for (const [method, path] of [["POST", "/api/admin/products"], ["PUT", "/api/admin/products/1"], ["PATCH", "/api/admin/products/1/status"], ["PUT", "/api/admin/products/1/image"]]) {
      assert.equal((await request(path, { cookie: customerAgain.cookie, method, body: {} })).status, 403);
    }
    for (const [method, path] of [["POST", "/api/admin/categories"], ["PUT", "/api/admin/categories/1"], ["PATCH", "/api/admin/categories/1/status"]]) {
      assert.equal((await request(path, { cookie: customerAgain.cookie, method, body: {} })).status, 403);
    }
  } finally {
    await request("/api/auth/logout", { cookie: customerAgain.cookie, method: "POST" });
  }
});

test("invalid credentials, malformed input and unsupported roles cannot log in", async () => {
  assert.equal((await request("/api/auth/login", { body: { email: 1, password: [] } })).status, 400);
  for (const [email, password] of [["customer@example.test", "wrong"], ["missing@example.test", "wrong"], ["unknown@example.test", "test-password-123"]]) {
    const result = await login(email, undefined, password);
    assert.ok([401, 403].includes(result.status));
    assert.equal(result.cookie, undefined);
    assert.equal(result.data.user, undefined);
  }
});

test("legacy API login uses the unified handler", async () => {
  const result = await login("admin@example.test", undefined, undefined, "/api/auth/admin/login");
  try { assert.equal(result.status, 200); assert.equal(result.data.user.role, "admin"); }
  finally { if (result.cookie) await request("/api/auth/logout", { cookie: result.cookie, method: "POST" }); }
});

test("customer profile updates allow only name and password", async () => {
  const loggedIn = await login("customer@example.test");
  let cookie = loggedIn.cookie;
  try {
    const restrictedName = await request("/api/auth/profile/name", {
      cookie, method: "PATCH", body: { fullName: "Crafted", email: "new@example.test" }
    });
    assert.equal(restrictedName.status, 400);

    const renamed = await request("/api/auth/profile/name", {
      cookie, method: "PATCH", body: { fullName: "Updated Customer" }
    });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.data.user.fullName, "Updated Customer");
    assert.equal(renamed.data.user.email, "customer@example.test");
    assert.equal(renamed.data.user.mobileNumber, "+919876543210");
    assert.equal(renamed.data.user.profileImageUrl, undefined);
    assert.equal(renamed.data.user.password_hash, undefined);

    assert.equal((await request("/api/auth/profile/password", {
      cookie, method: "PATCH", body: {
        currentPassword: "wrong-password", newPassword: "new-password-456",
        confirmPassword: "new-password-456"
      }
    })).status, 401);

    assert.equal((await request("/api/auth/profile/password", {
      cookie, method: "PATCH", body: {
        currentPassword: "test-password-123", newPassword: "new-password-456",
        confirmPassword: "new-password-456", role: "admin"
      }
    })).status, 400);

    const changed = await request("/api/auth/profile/password", {
      cookie, method: "PATCH", body: {
        currentPassword: "test-password-123", newPassword: "new-password-456",
        confirmPassword: "new-password-456"
      }
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.password_hash, undefined);
    await request("/api/auth/logout", { cookie, method: "POST" });
    cookie = undefined;
    assert.equal((await login("customer@example.test", undefined, "test-password-123")).status, 401);
    const relogin = await login("customer@example.test", undefined, "new-password-456");
    assert.equal(relogin.status, 200);
    cookie = relogin.cookie;
  } finally {
    if (cookie) await request("/api/auth/logout", { cookie, method: "POST" });
    users[0].full_name = "Customer";
    users[0].password_hash = hash;
  }
});

test("signup rejects password mismatch and client-supplied role before persistence", async () => {
  const baseSignup = {
    fullName: "New Customer", email: "new@example.test", mobileNumber: "+919876543211",
    password: "signup-password-123", confirmPassword: "different-password-123"
  };
  assert.equal((await request("/api/auth/signup", { body: baseSignup })).status, 400);
  assert.equal((await request("/api/auth/signup", {
    body: { ...baseSignup, confirmPassword: baseSignup.password, role: "admin" }
  })).status, 400);

  const accepted = await request("/api/auth/signup", {
    body: { ...baseSignup, confirmPassword: baseSignup.password }
  });
  assert.equal(accepted.status, 200);
  assert.equal(savedPendingRegistration.fullName, "New Customer");
  assert.equal(savedPendingRegistration.email, "new@example.test");
  assert.equal(savedPendingRegistration.mobileNumber, "+919876543211");
  assert.equal(savedPendingRegistration.profileImageUrl, null);
  assert.notEqual(savedPendingRegistration.passwordHash, baseSignup.password);
  assert.equal(await bcrypt.compare(baseSignup.password, savedPendingRegistration.passwordHash), true);
});

test("OTP verification creates a customer with pending profile data", async () => {
  const otp = "123456";
  const pending = {
    id: "99", full_name: "OTP Customer", email: "otp@example.test",
    mobile_number: "+919876543212", profile_image_url: "/uploads/profiles/otp.webp",
    password_hash: await bcrypt.hash("otp-password-123", 4),
    otp_hash: await bcrypt.hash(otp, 4),
    otp_expires_at: new Date(Date.now() + 60_000), otp_attempts: 0
  };
  let inserted = null;
  pool.connect = async () => ({
    query: async (sql, values) => {
      if (sql.includes("SELECT *") && sql.includes("pending_registrations")) {
        return { rows: [pending] };
      }
      if (sql.includes("INSERT INTO users")) {
        inserted = { sql, values };
        return { rows: [] };
      }
      return { rows: [] };
    },
    release() {}
  });
  try {
    const result = await request("/api/auth/verify-otp", {
      body: { email: pending.email, otp, role: "admin" }
    });
    assert.equal(result.status, 201);
    assert.match(inserted.sql, /VALUES \(\$1, \$2, \$3, \$4, \$5, 'customer'\)/);
    assert.deepEqual(inserted.values.slice(0, 4), [
      pending.full_name, pending.email, pending.mobile_number, null
    ]);
    assert.equal(inserted.values[4], pending.password_hash);
    assert.equal(result.data.password_hash, undefined);
  } finally {
    pool.connect = originalConnect;
  }
});

test("admins and unauthenticated callers cannot update customer profiles", async () => {
  assert.equal((await request("/api/auth/profile/name", {
    method: "PATCH", body: { fullName: "No Session" }
  })).status, 401);
  const admin = await login("admin@example.test");
  try {
    assert.equal((await request("/api/auth/profile/name", {
      cookie: admin.cookie, method: "PATCH", body: { fullName: "Admin Changed" }
    })).status, 403);
    assert.equal((await request("/api/auth/profile/password", {
      cookie: admin.cookie, method: "PATCH", body: {
        currentPassword: "test-password-123", newPassword: "admin-password-456",
        confirmPassword: "admin-password-456"
      }
    })).status, 403);
  } finally {
    await request("/api/auth/logout", { cookie: admin.cookie, method: "POST" });
  }
});

test("session store failure cannot report a successful login", { skip: postgres }, async () => {
  const originalSet = store.set;
  store.set = (_sid, _session, callback) => callback(new Error("simulated store failure"));
  try {
    const result = await login("customer@example.test");
    assert.equal(result.status, 500);
    assert.equal(result.data.user, undefined);
  } finally { store.set = originalSet; }
});
