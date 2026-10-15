# Architecture and trust boundaries

Laravel is the authoritative modular monolith. Next.js renders the web client. Native Expo work follows the social modules, sharing schema-validated contracts from packages/api-contracts. No university endorsement or integration is implied.

Web requests use a Next.js same-origin rewrite to Laravel. Sanctum uses the Laravel session cookie and XSRF-TOKEN double-submit header, never a browser bearer token. Protected campus routes require both email verification and approved membership. Roles are independent of academic affiliations; registration cannot assign a role or approved state.

Institution/faculty/department/cohort relationships are validated against the configured institution. Public API resources explicitly allowlist fields and omit email, private verification evidence and internal privilege details. Administrator actions are transactionally audited. Verification evidence is textual justification only; no identity documents or student IDs are collected.

Database design precedes each module. Unique keys enforce usernames, profiles and academic names. Future relationship tables require compound uniqueness. PostgreSQL is the deployment database; SQLite is only an isolated compatibility test option.

Milestones are gated. Installing a framework, writing Docker YAML, or passing a build does not prove a running Docker stack, accessible UI, physical-device support or production deployment.
