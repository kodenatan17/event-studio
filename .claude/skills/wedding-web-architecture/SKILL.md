---
name: wedding-web-architecture
description: Architecture and conventions of the Undangan AI monorepo — pnpm/Turborepo layout, Next.js App Router routes and Route Handlers, packages/contracts Zod schemas, tenant-scoped database and Supabase migrations/RLS, draft vs published manifest, publish/rollback pipeline, API error envelope, env and test setup. Load before finding, designing, writing or reviewing app, API or data code.
---

# wedding-web-architecture

Source of truth: `architecture.md` §2–5, §15 and `api-contracts.md` §7, §9. This is a map; open the section for detail.

## Layout & ownership (`architecture.md` §4.2–4.3)
| Path | Owns | Must not |
|---|---|---|
| `apps/web/app/(public)/w/[slug]` | Published viewer page, 2D fallback | Read draft data |
| `apps/web/app/i/[slug]/route.ts` | Invite token exchange → guest session → 303 | Render, log or cache the token |
| `apps/web/app/(studio)/studio/...` | CMS screens (`specs.md` §10) | Trust client ownership |
| `apps/web/app/api/{public,studio,health}` | Route Handlers (Node.js runtime for DB/storage SDKs) | Return raw exceptions |
| `packages/contracts` | Zod schemas + inferred TS types for API and manifest | Be duplicated by hand anywhere |
| `packages/database` | Tenant-scoped queries, repositories, transactions | Run without a `wedding_id` scope |
| `packages/wedding-features` | Domain overlays + action handlers (gallery, storybook, event-info, rsvp, guestbook, photo-booth) | Reach into engine internals |
| `packages/world-engine` | Rendering/scene/navigation (see `world-engine` skill) | Know wedding entities |
| `packages/ui` | Accessible design system | |
| `supabase/migrations`, `seed.sql` | Schema, indexes, RLS; seed dev/test only | Hold real data |

## Request chain to mirror
Zod schema in `contracts` → repository in `database` (+ migration/RLS) → Route Handler: parse → authenticate → authorize (membership/role or guest session) → call repository → DTO → feature UI/overlay. Same chain for every endpoint in `api-contracts.md` §9.

## Access model (`architecture.md` §4.4)
- Studio: Supabase user **and** `wedding_members` row for the `wedding_id` (`owner` / `editor`). Publish/rollback per `architecture.md` §3.1.
- Public reads: active published manifest + approved guestbook only.
- Guest writes: guest session scoped to one `wedding_id` + `guest_id` (`api-contracts.md` §5.3).
- Privileged DB operations server-side with explicit checks; service-role client server-only.

## Data model (`architecture.md` §5.1)
Tables: `profiles`, `weddings`, `wedding_members`, `world_templates`, `scene_templates`, `wedding_drafts`, `media_assets`, `wedding_events`, `story_chapters`, `guests`, `rsvps`, `guestbook_entries`, `wedding_publications`, `audit_logs`.
- UUID IDs, `timestamptz` UTC, `created_at`/`updated_at` on mutable rows; event display in the wedding's IANA timezone.
- Key uniques: `weddings.slug`; (`wedding_id`,`user_id`); (`wedding_id`,`guest_id`) on `rsvps`; (`wedding_id`,`version`) on publications.
- Required indexes are listed at the end of §5.1. Wedding deletion is an authorized/admin action, never a cascade side effect of editing.

## Draft vs published (`architecture.md` §5.2)
- Canonical editing: normalized tables for events/stories/guests, `wedding_drafts.document` JSON for layout/theme/decor.
- Every draft write sends `expectedRevision`; mismatch → `409 CONFLICT`.
- Viewer reads `weddings.active_publication_id → wedding_publications.manifest`, parsed with `WeddingManifestV1Schema` (`api-contracts.md` §7.1).
- Publish: authorize → validate fields/assets/links → promote draft assets → verify → immutable publication with next version → **atomic** pointer switch → cache invalidation. Serialize per wedding; accept `expectedDraftRevision` + idempotency key. Failure before the switch leaves the active version untouched.
- Rollback moves the pointer to an older valid version; history stays immutable; referenced assets are never deleted.

## API conventions (`api-contracts.md` §9)
- JSON; error envelope `{ error: { code, message, details[], requestId } }`, message in Indonesian.
- Status: 200/201/204 · 400 invalid · 401 unauthenticated · 403 unauthorized · 404 absent or cross-tenant · 409 conflict · 413/415 media · 422 business state · 429 rate-limited · 500.
- Public manifest GET returns `ETag`; immutable versions cache long, the active pointer revalidates promptly.
- Client never creates authoritative IDs or storage keys.

## State
Zustand for transient viewer/editor state (scene, overlay, avatar, quality, sound). Persistent data comes from the server. `localStorage` only for avatar preset and mute — nothing personal.

## Env & commands (`architecture.md` §15)
- Public: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ASSET_CDN_URL`. Everything else (service role, `DATABASE_URL`, R2, `GUEST_SESSION_SECRET`, rate-limit store) is server-only.
- `pnpm dev | lint | typecheck | test | test:e2e | build | assets:validate | db:migrate | db:seed` (seed refuses production).

## Tests (`specs.md` §13)
Vitest unit/integration beside the package they test; Playwright scenarios `E2E-01..12` in `e2e/`. Test names carry the ID. Local adapters are allowed for missing services but do not count as real integration passes.

## Rules
- Mirror the nearest existing file; in an empty area follow this map. No packages outside the locked stack (`architecture.md` §2) unless the task needs them; record version choices in `docs/decisions.md`.
- Never swallow errors: map them to the envelope and a designed UI state (loading, empty, offline, validation, permission — `specs.md` FR-11).
