# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains App Router routes grouped by concern (`(admin)`, `(dashboard)`, `api`, `login`) plus `layout.tsx` and `globals.css`.
- `components/` hosts shared UI; prefer reusing these patterns before adding new variants.
- `lib/` holds domain logic (auth, db, stripe) and Drizzle setup; `lib/db/schema` is the source of truth for models.
- `scripts/` includes operational helpers; check here before adding ad-hoc scripts.
- `.env.example` lists required vars; copy to `.env` locally and keep secrets out of git.

## Build, Test, and Development Commands
- Prereqs: Postgres running locally, Stripe CLI logged in, pnpm installed.
- `pnpm dev` - run the app locally with Turbopack.
- `pnpm build` / `pnpm start` - create and serve the production build.
- `pnpm db:setup` - scaffold `.env` and prepare local database defaults.
- `pnpm db:generate` - generate Drizzle migrations after schema edits; review and commit the SQL.
- `pnpm db:migrate` - apply migrations; run after `db:generate` and before seeding.
- Seeds: `pnpm db:seed`, `db:seed:quests`, `db:seed:sample`, `db:seed:dev-quests` for different demo/dev datasets.

## Coding Style & Naming Conventions
- TypeScript-first; default to server components and add `"use client"` only when interactivity requires it.
- Naming: PascalCase for components, camelCase for utilities, kebab-case for route segments.
- Keep business logic in `lib/` or server actions; keep components presentational.
- Use 2-space indentation. Prefer Tailwind utilities and existing `clsx`/`cva` helpers for variants.

## Testing Guidelines
- No repo-wide tests yet; when adding, use Vitest/Testing Library for units and Playwright for flows.
- Name tests `*.test.ts`/`*.test.tsx` near the code or in `__tests__/`.
- Keep seeds deterministic for e2e; document any fixtures alongside tests.

## Commit & Pull Request Guidelines
- Follow existing history: `feat: ...`, `fix: ...`, `chore: ...`; imperative, about 72-character subjects.
- Before PR: run `pnpm build` and necessary `db:migrate`; note any skipped steps.
- PRs should include scope/impact, linked issue/quest, and screenshots for UI changes.

## Security & Configuration Tips
- Do not commit `.env`; derive from `.env.example` and keep secrets in env vars.
- Rotate Stripe and Postgres credentials periodically; avoid logging secrets.
- For local webhooks, use `stripe listen --forward-to localhost:3000/api/stripe/webhook` and confirm handlers before deploying.

## AI / Agent Interaction Guidelines
- When using Codex or other AI coding agents in this repository, prefer responses and explanations in Japanese.
- Source code, identifiers, commit messages, and in-code comments should remain in English unless explicitly required otherwise.
- These guidelines apply to natural-language outputs (reviews, explanations, suggestions) and do not change the repository’s coding or naming conventions.
