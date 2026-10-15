# Dependency review, 2026-10-15

Actual `npm audit` reports five high entries but one underlying advisory chain: eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces. Installed braces and the published latest are both 3.0.3. The [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) covers <=3.0.3 and provides no patched published release at review time. `npm audit fix --force` suggests eslint-config-next 14.2.35, a major mismatch with Next.js 16.4.1. It was not applied, no advisory was suppressed and lint remains enabled.

React/react-dom received compatible patch updates 19.3.0 → 19.3.1. Lint/typecheck and Next.js production build passed after this update. ESLint 10 and TypeScript 7 are major upgrades rather than a compatible fix for this braces issue; retained current compatible tooling.

Runtime-only web npm audit: **0 advisories**. Full tooling audit: **5 high entries unresolved**. This is not a clean full dependency/security certification. Recheck upstream patched braces/Next lint releases before v1.0.0.
