# Customer registration and profile flow

## Database migration

`server/migrations/001_customer_profile.sql` adds nullable `mobile_number` and
`profile_image_url` columns to both `users` and `pending_registrations`. Nullable
columns preserve every existing user and pending registration. The migration is
idempotent and was applied to the configured development PostgreSQL database. It
does not drop, recreate, truncate, or rewrite any table.

## Registration and OTP

1. `CustomerSignup.jsx` collects full name, email, mobile number, password,
   confirmation, and an optional JPG, PNG, or WebP file. It checks matching
   passwords and submits multipart form data to `POST /api/auth/signup`.
2. Express applies the existing signup rate limit. Multer keeps at most one image
   in memory and rejects files over 2 MB or unsupported declared MIME types.
   Sharp decodes the content, verifies its actual format, limits decoded pixels,
   rotates and crops it to 500 by 500, and re-encodes it as a generated WebP file.
3. The route validates and normalizes the name, email, mobile number, and
   password. It rejects unexpected body fields, so a submitted role is not
   accepted. Password and OTP values are stored only as bcrypt hashes.
4. PostgreSQL receives the pending name, normalized email/mobile, generated image
   URL, password hash, OTP hash, expiry, and attempt counter. An existing pending
   registration is updated without changing any registered user. Nodemailer sends
   the existing six-digit email OTP.
5. `POST /api/auth/verify-otp` locks the pending row in a transaction, enforces
   expiry and attempt limits, and checks the bcrypt OTP hash. Only after a valid
   OTP does it insert the pending data into `users`. The SQL supplies the literal
   role `customer`; no client role is read. The pending row is then deleted and
   the transaction commits.

## Profile reads and updates

1. The `/dashboard` page calls `GET /api/auth/me` with the existing PostgreSQL-
   backed session cookie. It shows the image, name, email, and mobile number.
   Store navigation has a Profile link; unauthenticated visitors are redirected
   to unified login, and admins are redirected to their dashboard.
2. `PATCH /api/auth/profile/name` runs behind `requireCustomer`, accepts exactly
   one key (`fullName`), validates it, and updates only `users.full_name` for the
   authenticated customer ID.
3. `PATCH /api/auth/profile/password` also runs behind `requireCustomer` and
   accepts exactly current, new, and confirmed password fields. It verifies the
   current bcrypt hash, validates and matches the new values, hashes the new
   password, and updates only `password_hash` for that customer ID.
4. Email, mobile number, profile image, and role have no update endpoint. Extra
   crafted fields cause a 400 response. Admin sessions receive 403 on customer
   profile mutations. Responses are mapped to safe fields and never include a
   password or OTP hash.

Admin customer listing and product permissions are unchanged. Product upload,
public product, cart, session, and storefront behavior are otherwise unchanged.

## Validation performed

- Server tests cover unified auth, signup validation and pending hashing, OTP
  promotion with the backend customer role, safe profile reads, name/password
  updates, restricted-field rejection, current-password checks, admin/customer
  boundaries, session rotation/logout, and decoded image validation.
- The same auth/profile suite was also run with the configured PostgreSQL session
  store. Fixture user queries keep registered user data unchanged.
- The Vite production build passed.
- ESLint still reports the two pre-existing errors in `CartContext.jsx:44` and
  `AdminProducts.jsx:30`; neither offending block is part of this phase.
- Live SMTP delivery and manual browser interaction were not performed.
