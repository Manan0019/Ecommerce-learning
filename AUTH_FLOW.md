# Unified authentication

## Inspection and migration requirements

The project uses React/Vite, Express 5, bcrypt, PostgreSQL (`pg`), and
`express-session` with `connect-pg-simple`. No migration files or migration runner
were found. A read-only `information_schema.columns` query confirmed these tables:

- `users`: id, full_name, email, password_hash, role, created_at.
- `pending_registrations`: identity/password fields, hashed OTP, expiry, attempts,
  last send time, created_at.
- `session`: sid, sess, expire.
- `products`: product fields, image_url, is_active, created_at, updated_at.

No migration is required for this change. No tables were reset, dropped, or altered.
Existing admin provisioning remains `server/scripts/createAdmin.js`.

The original split came from an explicit customer-only check in `/api/auth/login`,
customer-only middleware on `/api/auth/me`, a duplicated admin login handler/form,
and frontend links/redirects to two login pages. Customer login also redirected to
`/dashboard` rather than the requested `/`.

## Data flows

1. Login: `/login` reuses `CustomerLogin.jsx` (now headed Login), sends only email
   and password to `POST /api/auth/login` with credentials included. The backend
   normalizes the email, queries `users`, compares the password using bcrypt, and
   accepts only the database roles admin/customer. Client-supplied roles have no
   effect. Invalid credentials receive 401; malformed input receives 400.
2. Session: successful credentials trigger `req.session.regenerate`, then set
   userId/role, then explicitly save through the existing PostgreSQL store before
   returning success. Regeneration/save errors return 500. A failed save does not
   retry on response completion. The existing cookie name, lifetime, httpOnly,
   sameSite and production secure settings are unchanged.
3. Response/navigation: only id, fullName, email and role are returned in `user`;
   neither the password hash nor OTP fields are sent. The frontend navigates admin
   to `/admin/dashboard` and customer to `/`. Neither form offers role selection.
4. Identity/authorization: `GET /api/auth/me` loads either allowed role by the
   session userId. `requireAdmin` and `requireCustomer` wrap that same database
   lookup and enforce their specific role; authorization does not trust the role
   cached in the session. `/api/admin/me`, `/api/admin/customers` and all admin
   product endpoints remain admin-only. `/dashboard` redirects an admin to the
   admin dashboard now that `/me` also accepts admins.
5. Signup/OTP: unchanged. Signup validates input, hashes the password and OTP,
   saves a pending registration and sends the code through Nodemailer. OTP
   verification locks the pending row, checks expiry/attempts/hash, inserts a user
   with literal role customer, deletes the pending row and commits. It then sends
   the frontend to login. Public registration cannot create an admin.
6. Logout: the existing POST destroys either role's session and clears the cookie.
7. Compatibility/navigation: old `/admin/login` browser URLs redirect to `/login`;
   the old API POST `/api/auth/admin/login` is an alias of the same unified,
   rate-limited handler. The separate admin form is now a redirect component.
   Separate admin navigation was removed after HTTP auth tests passed, including
   the PostgreSQL session run. Admin pages now send expired/denied sessions to
   `/login`.
8. Products/cart: public product queries still filter active products; protected
   creation/edit/status/image routes retain requireAdmin. Multer/Sharp upload
   processing and existing files are unchanged. CartProvider still wraps the
   router, persists the guest cart locally and uses the unchanged quote endpoint.

## Current API inventory

- `/api/auth`: POST signup, verify-otp, login, admin/login (compatibility alias),
  logout; GET me.
- `/api/admin`: GET me, customers (admin only).
- `/api/admin/products`: GET/POST /; GET/PUT /:id; PATCH /:id/status;
  PUT /:id/image (admin only).
- `/api/products`: GET / and /:id (public, active products).
- `/api/cart/quote`: POST (public).
- `/uploads/products`: existing static product uploads.
- `/` and `/api/db-test`: existing API health/database endpoints.

Frontend routes remain `/`, `/signup`, `/verify-otp`, `/login`, `/dashboard`,
`/admin/login` (redirect), `/admin/dashboard`, `/admin/products`,
`/admin/products/new`, `/admin/products/:id/edit`, `/products`, `/products/:id`,
and `/cart`.

## Changed files

- `server/routes/authRoutes.js`: shared login handler, both-role me, save failure handling.
- `server/middleware/authMiddleware.js`: common identity lookup plus role guards.
- `server/package.json`, `server/tests/auth.test.js`: Node HTTP auth tests and test script.
- `client/src/pages/CustomerLogin.jsx`: unified form heading and role redirect.
- `client/src/App.jsx`, `client/src/pages/AdminLogin.jsx`: old URL compatibility.
- `client/src/pages/Home.jsx`, `client/src/components/StoreHeader.jsx`: one login link.
- `client/src/pages/AdminDashboard.jsx`, `AdminProducts.jsx`, `AddProduct.jsx`,
  `EditProduct.jsx`: auth/logout redirects to unified login.
- `client/src/pages/CustomerDashboard.jsx`: admin routing after shared identity lookup.
- `AUTH_FLOW.md`: inspection, flows and validation record.

Pre-existing user edits in `client/src/App.css` and
`client/src/pages/ProductDetails.jsx` were not changed by this work.

## Validation

- `npm.cmd test` in server: 4 passed. Exercises real HTTP, bcrypt, safe response,
  both roles, email normalization, session rotation, persisted identity, logout,
  customer denial on admin read/write product routes, customer-only guard,
  malformed/invalid credentials, unsupported roles, legacy alias and failed saves.
  Default tests use fixture user queries and an isolated MemoryStore.
- With `AUTH_TEST_POSTGRES=1`, `node --test tests/auth.test.js` from server uses
  the configured PostgreSQL session middleware: 3 passed, 1 intentionally skipped
  (MemoryStore failure injection). User queries remain fixtures; real accounts
  are not used or changed. Test sessions are logged out.
- `npm.cmd run build` in client: passed.
- `npm.cmd run lint` in client: failed on two existing issues:
  `CartContext.jsx:44` react-refresh/only-export-components and
  `AdminProducts.jsx:30` react-hooks/set-state-in-effect. Neither offending block
  was changed. These unrelated issues were left intact to keep scope minimal.
- No server lint/build scripts or frontend test script existed.
- Browser interaction, live SMTP/OTP delivery and successful product create/edit
  upload workflows were not exercised. Their implementation remains unchanged;
  the auth tests verify customers cannot enter the protected product routes.
- PowerShell blocked `npm.ps1`; commands were rerun through `npm.cmd`.
