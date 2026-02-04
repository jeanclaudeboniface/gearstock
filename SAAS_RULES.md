# SaaS Ground Rules & Best Practices

To maintain the integrity and security of the multi-tenant system, every developer must follow these rules:

## 1. Tenant Scoping
- **EVERY** query to business data (SpareParts, Stock, etc.) **MUST** include `tenantId: req.tenantId`.
- **NEVER** use `Model.find({})` or `Model.findOne({})` without a `tenantId` filter unless it's a cross-tenant admin operation.
- Use the `tenantStack` middleware for all business routes to ensure `req.tenantId` is populated and validated.

## 2. RBAC Enforcement
- Use `requireRole(['ROLE1', 'ROLE2'])` middleware for any route that performs write operations (`POST`, `PUT`, `DELETE`).
- **OWNER**: Full access to everything in the tenant.
- **MANAGER**: Can manage inventory and members (except other owners).
- **STOREKEEPER**: Can add parts and stock-in, but cannot delete or perform stock-out.
- **MECHANIC**: Can perform stock-out (use parts), but cannot add or edit parts.
- **VIEWER**: Read-only access to inventory and reports.

## 3. Data Integrity
- Tenant-scoped unique indexes (e.g., `{ tenantId: 1, name: 1 }` for `SparePart`) must be maintained in the schema.
- All IDs are transformed to `id` (virtual) in `toJSON` for frontend consistency.

## 4. Audit Logging
- All sensitive actions (`create`, `update`, `delete`, `stock-movements`) **MUST** be logged using the `logAudit` utility.
- Include `before` and `after` states for updates to facilitate debugging and compliance.

## 5. Frontend Development
- Always use `authAxios` from `AuthContext` for API calls; it automatically attaches the `X-Tenant-Id` header.
- Respect the `userRole` from `AuthContext` to hide/disable UI elements that the user cannot use.
- Handle `403 Forbidden` errors gracefully (the `authAxios` interceptor already shows an alert).

## 6. Security
- Never trust the `X-Tenant-Id` header without validating the user's membership in that tenant (handled by `membershipMiddleware`).
- Credentials (JWT) must be passed in the `Authorization` header.
