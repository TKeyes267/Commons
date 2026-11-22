# Architecture

## Prototype stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, React Server Components, Server Actions) | One codebase for pages and server logic; renders on the server, so data access never runs in the browser |
| Language | TypeScript (strict) | Type safety across the database, server and UI |
| Database | SQLite via libSQL, accessed through Drizzle ORM | Zero setup for the prototype; Drizzle keeps the schema and queries portable to PostgreSQL |
| Validation | Zod | Every server action validates its input before touching the database |
| Sessions | Signed JWT cookie (jose) referencing a server-side session row | Revocable sessions, no session data in the browser |

## Code layout

```
src/
  app/
    (app)/            Pages that require a verified member (Chamber, debates, polls, members)
    signin/           Identity verification
    conduct/          Code of conduct (public)
    actions/          Server actions: every write goes through here
  components/         Shared UI
  db/
    schema.ts         The data model
    index.ts          Database connection (server-only)
    seed.ts           Fictional demo data
  lib/
    auth/
      identity.ts     Identity provider interface and the mock provider
      session.ts      Creating, reading and revoking sessions
      dal.ts          requireMember(): the single gate to member data
    conduct.ts        "Pause before posting" checks
    queries.ts        Read queries (server-only)
docs/                 Vision, features, roadmap, architecture, security
```

## Rules the code follows

These are what make the move to production straightforward:

1. **One gate.** Every page and server action calls `requireMember()` before reading or writing member data. Nothing relies on middleware alone.
2. **All writes go through server actions**, and every action validates input with Zod and checks permissions on the server (for example, only the chair can close a debate).
3. **`server-only` modules.** The database, sessions and queries cannot be imported into browser code by mistake.
4. **Provider-neutral identity.** The rest of the app only sees a `VerifiedIdentity` object. Swapping the mock for GOV.UK One Login does not touch pages or actions.
5. **Minimal personal data.** Users are keyed by the identity provider's subject identifier. We keep the name, role and constituency, never documents, dates of birth or postcodes.
6. **Audit trail.** Sign-ins, posts, debate actions and chair rulings are written to `audit_events`.
7. **Portable schema.** UUID text keys, timestamps and constrained text enums map directly onto PostgreSQL types.

## Moving to production

### Database: SQLite to PostgreSQL

1. Change `drizzle.config.ts` to `dialect: "postgresql"`.
2. In `src/db/schema.ts`, swap `drizzle-orm/sqlite-core` for `drizzle-orm/pg-core`:
   - `sqliteTable` becomes `pgTable`
   - `integer(..., { mode: "timestamp" })` becomes `timestamp(..., { withTimezone: true })`
   - `integer(..., { mode: "boolean" })` becomes `boolean(...)`
   - Text enums become `pgEnum`s
   - The id helper becomes `uuid("id").primaryKey().defaultRandom()`
3. Replace the libSQL client in `src/db/index.ts` with `postgres` or `pg` and `drizzle-orm/postgres-js`.
4. Swap `drizzle-kit push` for generated, reviewed migrations (`drizzle-kit generate` and `migrate`).
5. Replace the correlated `count(*)` subqueries in `lib/queries.ts` with indexed counters or materialised views once volumes grow.

Recommended hosting: a managed PostgreSQL service in a UK region (for example AWS eu-west-2 London or Azure UK South), with encryption at rest, point-in-time recovery and private networking.

### Identity: mock to GOV.UK One Login

See [security.md](security.md#identity-verification).

### Mobile

The server actions and queries can be exposed as a versioned JSON API for a React Native (Expo) app. Sessions on mobile would use the platform keychain and passkeys rather than cookies.
