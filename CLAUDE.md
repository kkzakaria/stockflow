# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StockFlow** is a multi-warehouse inventory management web application. It manages products, stock movements, inter-warehouse transfers (with approval workflows), inventory sessions, alerts, and audit logging. Currency is XOF (Franc CFA). The app targets ~10 warehouses, ~3000 products, ~500 movements/day, and ~20 concurrent users.

## Tech Stack

- **Frontend:** SvelteKit 2 + Svelte 5 (runes), Tailwind CSS 4, MDsveX
- **Backend:** Cloudflare Workers (edge), SvelteKit server routes
- **Database:** Cloudflare D1 (SQLite) via Drizzle ORM
- **Auth:** Better Auth (email/password, sessions, RBAC with 6 roles)
- **i18n:** Paraglide JS (en, es, fr)
- **Testing:** Vitest (unit/component/storybook), Playwright (E2E)
- **Package manager:** pnpm
- **Deployment:** Cloudflare Pages + Workers

## Commands

```bash
pnpm dev              # Start dev server (Vite)
pnpm build            # Production build
pnpm run preview      # Build + preview via wrangler dev
pnpm check            # svelte-kit sync + svelte-check
pnpm lint             # prettier --check + eslint
pnpm format           # prettier --write

# Testing
pnpm test:unit        # Vitest (watch mode)
pnpm test:unit -- --run  # Vitest single run
pnpm test:e2e         # Playwright E2E tests
pnpm test             # Unit (run) + E2E

# Database (Drizzle)
pnpm db:push          # Push schema directly to local DB (dev only, no migrations)
pnpm db:generate      # Generate SQL migration files (for production)
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Visual DB explorer

# Storybook
pnpm storybook        # Dev on port 6006
pnpm build-storybook  # Build static storybook

# Cloudflare
pnpm gen              # Generate Wrangler types
pnpm cf-typegen       # Generate worker types to src/worker-configuration.d.ts
pnpm deploy           # Build + wrangler deploy
```

## Architecture

### Database Schema

Source of truth: `src/lib/server/db/schema.ts` (Drizzle ORM, SQLite dialect).

**DB workflow:** Use `db:push` during development for fast iteration (no migration files). Use `db:generate` + `db:migrate` only for production. The `drizzle.config.ts` requires `DATABASE_URL` env var.

**Target tables (per PRD):** user, session, account, verification (Better Auth), warehouses, user_warehouses, categories, products, product_warehouse (stock per warehouse + PUMP), movements, transfers, transfer_items, inventories, inventory_items, alerts, audit_logs.

### Target Project Structure (per dev plan)

```
src/
├── lib/
│   ├── components/       # Svelte components by domain (ui/, layout/, products/, etc.)
│   ├── server/
│   │   ├── db/           # schema.ts (source of truth), index.ts (db instance)
│   │   ├── auth/         # Better Auth config, RBAC helpers
│   │   └── services/     # Business logic (stock.ts, alerts.ts, audit.ts, transfers.ts, etc.)
│   ├── validators/       # Zod schemas per entity
│   ├── stores/           # Svelte stores (network, auth, notifications, offlineQueue)
│   ├── services/         # Client-side services (offline-queue.ts using IndexedDB)
│   ├── utils/            # Helpers (formatXOF, permissions, constants)
│   └── types/            # TypeScript type definitions
├── routes/
│   ├── (auth)/           # Public routes: login, forgot-password, reset-password, setup-account
│   ├── (app)/            # Authenticated routes: dashboard, products, warehouses, movements,
│   │                     # transfers, inventory, users, alerts, logs, settings
│   └── api/
│       ├── auth/[...betterauth]/  # Better Auth catch-all handler
│       └── v1/                    # REST API endpoints
```

### Key Architectural Decisions

- **Stock service** (`src/lib/server/services/stock.ts`): All stock operations use Drizzle transactions for atomicity. PUMP (weighted average cost) is calculated in SQL within `onConflictDoUpdate`, not in JS.
- **PUMP formula:** `new_pump = ((current_qty * current_pump) + (received_qty * purchase_price)) / (current_qty + received_qty)`. PUMP only changes on stock entries, not exits.
- **6 RBAC roles** with hierarchy: admin (100) > admin_manager (80) > manager (60) > user (40) > admin_viewer (20) > viewer (10). Roles with global scope: admin, admin_manager, admin_viewer. Others are scoped to assigned warehouses via `user_warehouses`.
- **Transfer workflow** has 8 statuses as a state machine: pending → approved/rejected/cancelled → shipped → received/partially_received → disputed → resolved.
- **Offline resilience**: Movements and inventory counts queue to IndexedDB when offline, auto-retry on reconnect. Transfers and product creation require server validation.
- **i18n**: Paraglide middleware in `hooks.server.ts`, URL-based locale routing via `hooks.ts` reroute.

### SvelteKit Hooks

- `hooks.server.ts`: Currently handles Paraglide i18n middleware. Will also handle Better Auth session validation and route protection.
- `hooks.ts`: Paraglide URL rerouting (deLocalizeUrl).

### Cloudflare Platform

Access Cloudflare bindings via `event.platform.env` in server routes. The `app.d.ts` types the Platform interface with `Env`, `CfProperties`, and `ExecutionContext`.

## Code Conventions

- **Formatting:** Tabs, single quotes, no trailing commas, 100 char print width (see `.prettierrc`)
- **TypeScript:** Strict mode. Interfaces for objects, types for unions. No `any`.
- **DB conventions:** snake_case tables (plural except `user` for Better Auth), TEXT IDs (UUID/nanoid), TEXT timestamps (ISO 8601), soft delete via `is_active INTEGER DEFAULT 1`
- **API conventions:** Base URL `/api/v1`, JSON, pagination via `?page=1&limit=20`, errors as `{ error: { code, message } }`, amounts in XOF as numbers
- **Commit convention:** `feat(module):`, `fix(module):`, `chore:`, `docs:`
- **Svelte:** Use Svelte 5 runes syntax. Run `svelte-autofixer` MCP tool on all Svelte code before finalizing.
- **Validation:** Zod schemas on server side for all input validation

## Svelte MCP Server

When working on Svelte code, use the Svelte MCP server tools:

1. `list-sections` — Discover available Svelte 5 / SvelteKit documentation sections
2. `get-documentation` — Fetch full docs for relevant sections
3. `svelte-autofixer` — Validate Svelte components (run until no issues remain)
4. `playground-link` — Generate Svelte Playground link (only if code was NOT written to project files)

## Testing Configuration

Vitest runs 3 test projects configured in `vite.config.ts`:

- **client**: Browser-based Svelte component tests (`*.svelte.{test,spec}.ts`), excludes `src/lib/server/`
- **server**: Node-based tests (`*.{test,spec}.ts`), excludes Svelte component tests
- **storybook**: Storybook story tests via `@storybook/addon-vitest`

`requireAssertions: true` is enabled globally — every test must contain at least one assertion.

E2E tests use Playwright (config in `playwright.config.ts`), test files in `e2e/`.
