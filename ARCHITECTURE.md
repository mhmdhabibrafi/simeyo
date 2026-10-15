# Architecture

See [decisions](docs/architecture/decisions.md). Simeyo is a monorepo with `apps/web` (Next.js App Router), `apps/api` (Laravel 12/Sanctum), `apps/mobile` (Expo SDK 57 / React Native), `packages/api-contracts` (generated types + shared Zod), `packages/design-tokens`, `infrastructure`, and `docs`. Mobile implementation and verification limits are recorded in [MOBILE.md](MOBILE.md).

Laravel owns persistence, authentication, verification and policy decisions. Controllers remain split across identity, profiles, verification and media. Database transactions protect multi-record changes. Next.js's API rewrites are transport only; it does not duplicate authoritative business logic.

UI components include buttons, accessible Radix dialogs/dropdowns/popovers, avatars, form fields/errors, skeletons, toast feedback, responsive desktop/bottom navigation and a synchronized light/dark theme. The CSS/shadcn-compatible component system follows Simeyo's violet/neutral design tokens. Consumer-style content layouts use subtle academic metadata, without faculty badge boxes. Motion libraries are installed; animation is limited to loading pulses and CSS transitions, with reduced-motion support.

Redis, S3 and Reverb adapters are installed/configured foundations. Current Windows dev uses database sessions/cache/queue and private local storage. Redis/MinIO Docker round trips and realtime application events have not been verified. Meilisearch is an optional infrastructure service with no search application adapter yet.
