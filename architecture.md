# UNDANGAN AI — WEDDING WORLD
## System Architecture & Engineering Decisions

> **Document:** `architecture.md`  
> **Version:** 1.0.1 (split from baseline v1.0.0)  
> **Date:** 2026-10-29  
> **Status:** Baseline implementation contract  
> **Language:** English for technical contracts; product-facing copy may be Indonesian  
> **Audience:** Autonomous coding agents, frontend/backend engineers, 3D engineers, QA, 3D artists

---

## Documentation map & precedence

| File | Responsibility / authority |
|---|---|
| [`specs.md`](specs.md) | Product behavior, all 11 feature acceptance criteria, CMS UX, test plan, task order and release gates. **Authoritative for product scope.** |
| [`architecture.md`](architecture.md) | Stack, routes, 3D engine, data schema/lifecycle, assets, deployment, performance and security. **Authoritative for system design.** |
| [`api-contracts.md`](api-contracts.md) | Published world manifest, guest invitation/session flow, public and studio HTTP contracts, error responses and media upload constraints. **Authoritative for API boundaries.** |

The original cross-document section IDs (0–20, including 5.3) have been retained for traceability. Noncontiguous numbers are intentional. **Coding agents must read all three files before implementation.** If requirements appear inconsistent, follow the file authoritative for that concern, document the discrepancy in `docs/decisions.md`, and never silently remove an acceptance criterion.


**Document ownership:** Architecture is responsible for system composition, persistence, data isolation, scene engine, media lifecycle, security and operations. API wire details live in [`api-contracts.md`](api-contracts.md); feature acceptance and task sequencing live in [`specs.md`](specs.md).

---

<a id="sec-2"></a>

# 2. DECISIONS & ASSUMPTIONS — LOCKED FOR V1

| Area | Decision |
|---|---|
| Delivery | Responsive web application, no native app installation |
| Deployment unit | **One Next.js App Router web app** with `/w/*` public viewer and `/studio/*` CMS; reusable packages in monorepo. Extract separate applications later only if justified. This deliberately reduces MVP integration/deployment overhead compared with a two-app concept. |
| Language | TypeScript with strict type checking |
| Repo | pnpm workspace + Turborepo (single deployable app plus shared packages) |
| UI | React, Tailwind CSS, accessible dialog/forms, minimal dependencies |
| 3D | Three.js, React Three Fiber, Drei, Blender-authored GLB/glTF |
| UI state | Zustand for transient viewer/editor state; server as source of truth for persistent data |
| Database/Auth | Supabase-hosted PostgreSQL + Supabase Auth for studio; SQL migrations tracked in repo |
| Files | Cloudflare R2: private draft media and public published assets via controlled promotion |
| API | Next.js Route Handlers, Node.js runtime for routes that need database/storage SDKs |
| World content | Server-validated **versioned published JSON manifest** consumed by viewer |
| World theme | One production-ready stylized low-poly template with four scenes |
| Scenes | `entrance`, `living-room`, `wedding-garden`, `reception-hall` |
| Narrative UI | 3D book is clickable; content rendered in accessible HTML dialog/panel |
| Movement | Tap-to-move on navigable floor; hotspot-directed path; portal transition; quick scene menu |
| Character | Single-player guest avatar from 3–5 licensed/owned presets; no synchronous multiplayer |
| Photo booth | Generate image from 3D guest avatar + groom/bride preset models + frame; save on device, **no server upload by default** |
| Customization | Predefined theme, color, scene and decoration variants; **no freeform scene editor** |
| RSVP | Invitation-token-required by default; one RSVP record per guest per wedding, updatable |
| Guestbook | Invitation-token-required submission; public sees approved-only entries |
| Locale/time | Indonesian (`id-ID`), event timezone default `Asia/Jakarta`, stored as IANA timezone |
| Publish | Explicit `Preview → Publish` workflow with snapshot/versioning and rollback capability |
| Accessibility | Critical content available through DOM-based quick-access menu and 2D fallback |
| Content examples | Seed couple and guest names are fake; user-provided content only in live weddings |

**Version policy:** At setup choose currently supported mutually compatible stable releases of Next.js, React, React Three Fiber, Three.js, Supabase clients, Playwright, and other packages; commit exact lockfile; document version selections in `docs/decisions.md`. Do not guess or mix incompatible major versions. Avoid unreleased/canary releases.

**Explicitly deferred:** payments, multilingual CMS, AI concierge, AI narration, user-generated 3D models, fully custom worlds, multiplayer, webcam selfies, GPS-triggered features, realtime guest presence, autonomous 3D generation, unlimited templates. Design interfaces so these can be added later without rewriting the world engine.

---

<a id="sec-3"></a>

# 3. USER EXPERIENCE / INFORMATION ARCHITECTURE

## 3.1 Route structure

| Route | Audience | Behavior |
|---|---|---|
| `/` | Public | Product landing or simple entry; not essential to MVP sales features |
| `/w/[slug]` | Public | Published 3D world viewer; 2D fallback on unsupported browsers |
| `/i/[slug]?t=<random-token>` | Invited guest | Token exchange endpoint/route; validates invitation, sets secure guest session cookie, **303 redirects to clean** `/w/[slug]` URL. `Referrer-Policy: no-referrer`, no token logging |
| `/studio/login` | Couple | Supabase Auth email magic-link sign-in |
| `/studio` | Authenticated | Wedding project list/dashboard |
| `/studio/weddings/new` | Authenticated | Wedding creation wizard |
| `/studio/weddings/[id]` | Member | Editing dashboard |
| `/studio/weddings/[id]/content` | Member | Couple, event, photos, story, guestbook settings |
| `/studio/weddings/[id]/world` | Member | Scene/template/decor variations |
| `/studio/weddings/[id]/guests` | Member | Guest list, invite links, RSVP summaries |
| `/studio/weddings/[id]/preview` | Member | Authenticated **unpublished** draft preview, never accidentally public |
| `/studio/weddings/[id]/publish` | Owner/editor | Publication status, validation, publishing, previous versions/rollback |

A direct link to `/w/[slug]` is always viewable when published, including guests without a personalized link. RSVP/guestbook submission remains gated behind invitation session by default.

## 3.2 Scene flow

```text
Public opening / initial loader
  └─ Entrance
      ├─ Name/welcome/ambient sound toggle
      └─ Open front door -> Living Room
          ├─ Click picture frame -> photo gallery overlay
          ├─ Click book -> interactive storybook overlay
          ├─ Garden portal -> Wedding Garden
          │   ├─ Ceremony details + view map
          │   └─ Photo booth interaction
          └─ Hall portal -> Reception Hall
              ├─ Event timeline / reception details
              ├─ RSVP overlay
              └─ Guestbook overlay

Global navigation on every scene:
  - Scene map / jump-to-scene
  - Event details shortcut
  - RSVP shortcut
  - Accessibility / 2D view
  - Sound mute/unmute
```

The global map **must** allow navigating from any scene to any unlocked scene. No task-critical content may rely on discovering a hidden 3D hotspot.

## 3.3 Scene template requirements

- **Entrance:** names, welcome sign, main front door; optional ambient music (off until user opts in); scene arrival camera.
- **Living Room:** photo frames (minimum three configurable image slots), storybook on table, navigable floor, links to Garden/Hall via portals or quick map.
- **Wedding Garden:** ceremony stage/arch, groom/bride models, photo booth hotspot, ceremony information hotspot.
- **Reception Hall:** reception decor, event timeline, RSVP booth/hotspot, guestbook booth/hotspot.
- Render coherent loading states; do not leave blank canvas. Create visible return paths and breadcrumb/map controls.

## 3.4 Core interaction rules

- Touch target for UI controls ≥44x44 CSS px where practical.
- A 3D object with an interactive hotspot must have a corresponding labeled HTML accessible control in quick access or context action list.
- Tapping floor moves avatar on navigable surface; tapping a hotspot either moves to interact range, then executes action, or executes immediately when navigating would harm usability. Document choice per action.
- Blocking dialogs stop avatar movement and other 3D interactions; restore focus and controls when closed.
- Mobile browser back closes an active overlay first, then preserves ordinary page navigation behavior; no aggressive history trapping.
- Loading assets can be canceled on scene switch; stale load callbacks must not activate an old scene.
- Persist selected avatar and muted state locally; do not store sensitive personal data in localStorage.

---

<a id="sec-4"></a>

# 4. SYSTEM ARCHITECTURE

## 4.1 Logical layers

```text
                          +----------------------------+
Browser / public guests ->| Next.js /w/[slug] viewer  |
                          | - React UI overlays        |
                          | - R3F World Engine         |
                          | - Guest Session (cookie)   |
                          +-------------+--------------+
                                        |
                                        v
                         Next.js API Route Handlers
                         (Zod, auth, rate limits, DTOs)
                                        |
                 +----------------------+---------------------+
                 |                      |                     |
           PostgreSQL             Supabase Auth          R2 Storage/CDN
           - tenant data          - studio users          - draft/private
           - guest tokens         - sessions              - published/public
           - publications                                - 3D templates
                 ^
                 |
                          +----------------------------+
Couple / editor --------->| Next.js /studio/*          |
                          | - Content forms            |
                          | - World configuration      |
                          | - Draft preview            |
                          | - Explicit publish         |
                          +----------------------------+
```

## 4.2 Recommended repository layout

```text
undangan-ai/
├─ apps/
│  └─ web/
│     ├─ app/
│     │  ├─ (public)/w/[slug]/page.tsx
│     │  ├─ i/[slug]/route.ts
│     │  ├─ (studio)/studio/...
│     │  ├─ api/public/weddings/[slug]/...
│     │  ├─ api/studio/weddings/...
│     │  └─ api/health/route.ts
│     ├─ components/
│     └─ lib/
├─ packages/
│  ├─ world-engine/
│  │  ├─ renderer/
│  │  ├─ scene-manager/
│  │  ├─ asset-manager/
│  │  ├─ navigation/
│  │  ├─ camera/
│  │  ├─ interaction/
│  │  ├─ avatar/
│  │  └─ quality/
│  ├─ wedding-features/
│  │  ├─ gallery/
│  │  ├─ storybook/
│  │  ├─ event-info/
│  │  ├─ rsvp/
│  │  ├─ guestbook/
│  │  └─ photo-booth/
│  ├─ contracts/              # Shared Zod schemas and TypeScript types
│  ├─ database/               # Queries, repositories, database types
│  ├─ ui/                     # Accessible design system
│  └─ config/                 # tsconfig, eslint, formatting
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql                # Development/test only
├─ assets/
│  ├─ source/                 # Licensing/provenance, Blender source links
│  ├─ optimized/              # Generated/public-ready outputs
│  └─ manifest/               # Asset descriptions
├─ scripts/                   # Asset validations, performance tests
├─ e2e/
├─ docs/
│  ├─ progress.md
│  ├─ decisions.md
│  ├─ asset-register.md
│  └─ runbook.md
├─ .env.example
├─ pnpm-workspace.yaml
├─ turbo.json
├─ specs.md                  # Feature scope / implementation roadmap
├─ architecture.md           # This file
└─ api-contracts.md          # HTTP / published manifest
```

## 4.3 Component ownership

- `world-engine` is independent of wedding-specific entities; consumes typed scene definitions, emits typed interactions.
- `wedding-features` registers domain interactions (`open_gallery`, `open_story`, etc.) and provides accessible overlays.
- `contracts` defines shared Zod schemas and API payloads; never duplicate handwritten types between API/CMS/viewer.
- `database` encapsulates tenant-scoped persistence and transaction logic.
- `apps/web` wires experience and authentication together; no raw database service-role key in browser bundles.

## 4.4 Backend access model

- Studio routes require authenticated Supabase user **and** membership for specific `wedding_id`.
- Public read routes expose only a sanitized **published** wedding snapshot and approved guestbook entries.
- Invitation-only writes require a validated guest session scoped to one `wedding_id` and one `guest_id`.
- Privileged DB operations execute server-side with explicit checks; never rely solely on hiding controls or filtering data on the client.
- Validate every request with schemas, field allowlists, quotas and explicit status codes.

---

<a id="sec-5"></a>

# 5. DATA MODEL & LIFECYCLE

Implement in versioned SQL migrations. UUID IDs unless otherwise specified; all timestamps `timestamptz` UTC. Display event times in the configured IANA timezone. Add `created_at`, `updated_at` to mutable entities and track `created_by` for administrative edits where feasible.

## 5.1 Required tables

| Table | Key columns | Constraints/security |
|---|---|---|
| `profiles` | `id` PK references `auth.users`, `display_name` | Self read/update |
| `weddings` | `id`, `slug` unique, `status` (`draft/published/archived`), `title`, `timezone`, `active_publication_id` nullable | Slug lowercase `[a-z0-9-]`, unique; no public access to drafts |
| `wedding_members` | `wedding_id`, `user_id`, `role` (`owner/editor`) | Unique pair; membership enforcement |
| `world_templates` | `id`, `code` unique, `version`, `name`, `is_active`, `scene_catalog` | Admin-managed and immutable by version |
| `scene_templates` | `id`, `template_id`, `scene_key`, `version`, `asset_url`, `navmesh_url`, `hotspots_schema` | Unique (`template_id`, `scene_key`, `version`) |
| `wedding_drafts` | `wedding_id` unique, `revision` int, `document` JSONB, `updated_by` | Editable only by member; optimistic concurrency |
| `media_assets` | `id`, `wedding_id`, `purpose`, `visibility`, `object_key`, `mime`, `size_bytes`, `status`, `checksum` | Tenant-scoped; `draft/processing/ready/rejected/published` lifecycle |
| `wedding_events` | `id`, `wedding_id`, `kind`, `title`, `starts_at`, `ends_at`, `timezone`, `venue_name`, `address`, `maps_url`, `sort_order` | Validate time order and URLs |
| `story_chapters` | `id`, `wedding_id`, `title`, `body`, `image_asset_id`, `event_date` optional, `sort_order` | Tenant-scoped, bounded text length |
| `guests` | `id`, `wedding_id`, `display_name`, `invite_token_hash`, `invitation_status`, `max_party_size` | Unique (`wedding_id`, `invite_token_hash`); token never returned in list DTO |
| `rsvps` | `id`, `wedding_id`, `guest_id`, `attendance`, `party_size`, `note` | Unique (`wedding_id`, `guest_id`); update requires same guest session |
| `guestbook_entries` | `id`, `wedding_id`, `guest_id`, `display_name_snapshot`, `message`, `moderation_status`, `approved_at` | Public read approved only; prevent mass enumeration |
| `wedding_publications` | `id`, `wedding_id`, `version` int, `manifest` JSONB, `created_by`, `published_at`, `asset_set_hash` | Unique (`wedding_id`, `version`); immutable records |
| `audit_logs` | `id`, `actor_user_id`, `wedding_id`, `action`, `entity_id`, `metadata`, `created_at` | Server write, restricted member read if exposed |

**Required indexes:** weddings by slug/status; all tenant tables by `wedding_id`; guestbook by (`wedding_id`, `moderation_status`, `created_at DESC`); rsvps by wedding; publications by wedding/version; `guests` token hash; membership by user ID. Implement cascading behavior deliberately: deleting weddings must be an authorized/admin-controlled operation, never accidental loss via routine editing.

## 5.2 Draft versus published

- CMS edits go to normalized content tables and/or `wedding_drafts.document`; identify one canonical editing representation and generate the publish manifest from it (preferred: normalized data for events/stories/guests, JSON draft for layout/theme/decor).
- `wedding_drafts.revision` increments on successful write; require `expectedRevision` to avoid overwriting another editor's changes. Return `409 CONFLICT` on mismatch.
- Public viewer reads `weddings.active_publication_id → wedding_publications.manifest`; it must never read draft JSON directly.
- Publish pipeline: authenticate+authorize → validate all fields/assets/links → prepare/optimize/promote draft assets to public origin → verify availability → create immutable publication/version → atomically switch `active_publication_id` → purge/invalidate relevant cache.
- If asset promotion fails, do not change active publication. If switching publication fails after copied assets exist, mark those extra objects for cleanup; never activate partial manifest.
- Rollback changes active publication pointer to an older valid version; keep immutable history.
- Previously published assets must remain available while referenced by active or rollback-eligible manifests. Introduce reference-aware cleanup.

**Guest invitation-token creation, exchange, cookies, revocation and multi-wedding session behavior** are specified in [`api-contracts.md` §5.3](api-contracts.md#sec-5-3). Refer there before implementing `guests` or `rsvps`.


---

<a id="sec-8"></a>

# 8. WORLD ENGINE TECHNICAL CONTRACT

## 8.1 Renderer

- React Three Fiber `<Canvas>` client-side only; don't SSR WebGL content.
- Scene-boundary component manages context, renderer settings and resource references.
- Default camera view: 3/4 elevated follow/isometric-ish view suitable for small-screen visibility, not first-person VR.
- Pixel ratio adaptive (cap on high-DPR phones); avoid unrestricted high-resolution shadow maps.
- Prefer baked lighting + limited dynamic shadows, instanced repeated decorations and compressed textures.
- Explicitly handle `webglcontextlost`, failed model loads and unsupported hardware with recoverable 2D mode.
- Use Suspense/error boundaries carefully: show meaningful loading feedback and do not obscure the global navigation.

## 8.2 State machine

```text
BOOT → LOADING_MANIFEST → LOADING_SCENE → READY
                                 |           |
                                 v           v
                              ERROR        OVERLAY_OPEN
                                 ^           |
                                 |           v
                    SWITCHING_SCENE <------ READY

Any render critical error → FALLBACK_2D
```

Maintain one source of truth for `currentSceneId`, `pendingSceneId`, `transitionStatus`, `activeOverlay`, `avatarPresetId`, `qualityProfile`, `soundEnabled`. When entering overlay, suspend avatar input. No duplicate scene listeners or controllers.

## 8.3 Interaction schema

Allowed actions:

```ts
type WorldAction =
  | { type: 'navigate'; sceneId: string; spawnPointId?: string }
  | { type: 'open_welcome' }
  | { type: 'open_gallery'; startIndex?: number }
  | { type: 'open_story'; chapterId?: string }
  | { type: 'open_event_info'; eventId?: string }
  | { type: 'open_rsvp' }
  | { type: 'open_guestbook' }
  | { type: 'open_photo_booth' };
```

- Map manifest `hotspot.action` to typed `WorldAction` using validated registry. Unknown actions fail safely with developer-visible warning, not arbitrary code execution.
- Use raycasting only for tagged interactables and supported floor/navmesh surfaces. Handle overlapping hotspots consistently.
- Abstract interaction so accessible HTML control and 3D hotspot invoke the **same action**.

## 8.4 Navigation and scene transitions

- Initial MVP navigation can be deterministic waypoint movement and collision against authored walkable/navmesh data. Full general pathfinding algorithm is optional if the authored scenes are simple, **but characters must never clip through solid furniture**.
- On scene switch: lock input → optionally preload target model → show transition → load target scene and enter spawn point → release old scene refs → unlock input.
- Protect against concurrent transitions using request ID/cancellation tokens. Clear event listeners and animation mixer's subscriptions on disposal.
- Use stable portal IDs and explicit destination spawn points. Quick map navigation always works even if portal route is missing.
- Separate avatar motion update from rendering; use frame delta with clamping and handle long inactive tab resumption.

## 8.5 Asset and Blender handoff

Standard source conventions:

```text
SCENE_<NAME>
FLOOR_WALKABLE
COLLIDER_*
SPAWN_ENTRY
SPAWN_<PORTAL>
HS_STORY / HS_RSVP / HS_GUESTBOOK / HS_PHOTO / HS_GALLERY_*
DECOR_<SLOT>_<VARIANT>
CAMERA_ENTRY
```

- Models authored in Blender, exported `.glb` with fixed scale conventions (meters, consistent up axis), named nodes and animation clips.
- Create `scripts/validate-assets` verifying file existence, size, expected node names, animations, variant compatibility, missing textures and maximum budgets.
- Optimize geometry and textures; use Meshopt/Draco/KTX2 only with correct loaders/decoders in runtime. Confirm decoding works on mobile target devices.
- Record model origin, artist, license, allowed usage and attribution requirements in `docs/asset-register.md`.
- Do not ship unlicensed downloaded assets. Placeholder primitives allowed in prototype only.

---

<a id="sec-11"></a>

# 11. ASSET PIPELINE & VISUAL PRODUCTION

## 11.1 Deliverables from 3D artist

1. One coherent stylized low-poly wedding world template with 4 authored GLB scenes.
2. Authored walkable/collision data and portal spawn nodes for each scene.
3. Living Room props: picture frames, readable book silhouette, furniture, framed photo attachment points.
4. Garden props: ceremony stage/arch, flower decor, photo booth backdrop and couple character models.
5. Hall props: reception table/area, RSVP booth, guestbook hotspot.
6. Three to five guest avatar model presets with compatible skeleton/animations or equivalent clip mapping.
7. Three photo poses supported by character rigging/animation clips; three 2D frame designs.
8. Two palettes, two lighting presets, six selectable decor slots with two variants per slot.
9. Optimized textures, GLB exports, model provenance/licenses, thumbnails and source Blender files where available.

## 11.2 Placeholder policy

During Milestone 0, block out all four scenes with procedural primitives. These prove mechanics and tests. Mark all art-dependent tasks as `ENGINEERING_DONE / ART_PENDING` or equivalent until production-ready models and licenses are verified. Do not replace missing props with misleading unrelated stock imagery in production.

## 11.3 Media and CDN

- R2 draft objects are private; private preview access uses short-lived authorized signed GET URLs.
- Published images are optimized and promoted into controlled publicly readable keys; avoid exposing draft filename/paths.
- CDN and storage CORS configured for 3D and screenshot operations; do not use arbitrary cross-origin texture sources.
- Set cache headers for content-hashed immutable assets. Version references instead of overwriting existing public asset keys.
- Maintain asset-use references per publication for safe cleanup.

---

<a id="sec-12"></a>

# 12. PERFORMANCE & ACCESSIBILITY BUDGETS

These are **targets requiring real-device measurement**, not guaranteed numbers.

| Measurement | Initial target / policy |
|---|---|
| Initial critical downloaded resources | Aim 2–5 MB before entrance interactivity on typical Wi-Fi |
| Subsequent 3D scene package | Aim 3–8 MB per scene; compress where possible |
| Interactive FPS | Aim sustained ≥30 FPS on defined mid-range Android and iPhone baseline |
| Loading experience | Visible progress, meaningful status and retry/fallback if failure |
| Canvas DPR | Adaptive; avoid unconstrained device pixel ratio |
| 3D memory | No sustained monotonic increase over 10 room transitions |
| Mode fallback | Functional 2D invitation if WebGL unavailable/context lost/performance too poor |
| Accessibility | WCAG 2.2 AA-oriented HTML UI, keyboard dialogs, proper labels/contrast, reduced motion |
| Audio | Off/muted by default; playback only after user gesture |

**Quality tiers:** `auto/high/low` with adaptive logic. Low tier disables expensive shadows and post-processing, reduces decorative objects, lowers DPR. Respect `prefers-reduced-motion`.

**2D fallback minimum:** Couple names, story chapters, gallery, ceremony/reception details, RSVP, approved guestbook, guestbook posting for invited guests, and accessible links. Photo booth may display explicit unsupported-device notice in 2D mode; other core invitation functions must still work.

**Instrumentation:** capture scene load duration, failed asset requests, JS errors, WebGL context loss and 3D transition errors. Never log guest tokens or message contents. Add optional non-sensitive performance profiling toggle in development.

---

<a id="sec-14"></a>

# 14. SECURITY, PRIVACY & CONTENT SAFETY

Mandatory checklist:

- [ ] Supabase studio auth via safe server/session cookies; RLS policies for each tenant-owned table; separate service-role client server-only.
- [ ] Every studio endpoint checks current membership/role; no direct object reference leakage.
- [ ] Guest token ≥256-bit entropy, hashed at rest, scoped session and rotation/revocation.
- [ ] No guest PII, invite token, internal user ID list, draft JSON or private object key in published manifest.
- [ ] Server-side input validation for every write; enforce byte count and quotas for images/text.
- [ ] CSRF/origin defense for cookie-authenticated mutations; secure cookie flags; standard security headers including CSP and referrer policy.
- [ ] Restrict external URLs to `https:` and trusted/validated hosts where relevant; reject `javascript:`, `data:` URLs in user-supplied links.
- [ ] Guestbook content rendered safely as text; moderate all new messages by default.
- [ ] R2 upload presigns scoped to authorized wedding and generated object key, short expiration; server verifies completed uploads.
- [ ] Studio audit logs on publish, rollback, token rotation, moderation actions.
- [ ] Rate limiting for guest token exchange, RSVP, guestbook, media upload, login-related abusive routes; durable in production.
- [ ] Logging redacts tokens, auth headers, cookies, private names/notes and user content.
- [ ] Security-focused API tests for cross-tenant access, unapproved guestbook visibility, upload misuse, replay, and stale sessions.
- [ ] User content deletion/export workflow and configurable media retention policy; review Indonesian personal-data obligations with appropriate counsel before commercial launch.
- [ ] Backup/restore plan for database and durable asset references; never delete active-publication assets.

**Threat model assumptions:** Public content may be shared widely. Personalized invite links function like limited bearer capabilities; guests should understand forwarding grants access to that invitee's RSVP. Avoid third-party analytics or tracking pixels on token exchange routes. Use general privacy-safe analytics only with appropriate consent and disclosures.

---

<a id="sec-15"></a>

# 15. LOCAL DEVELOPMENT, ENVIRONMENT & CI

## 15.1 Environment variables (names, no real values)

```dotenv
# Public (safe for browser)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ASSET_CDN_URL=

# Server only
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_DRAFT=
R2_BUCKET_PUBLIC=
R2_PUBLIC_BASE_URL=
GUEST_SESSION_SECRET=
RATE_LIMIT_STORE_URL=
RATE_LIMIT_STORE_TOKEN=
```

Store production secrets in deployment secret manager; never commit actual `.env*` files. Ensure `.env.example` and deployment runbook explain all variables. Set trusted origin/CORS and auth callback URLs for each environment.

## 15.2 Required commands

Implement root `package.json` scripts to work consistently:

```bash
pnpm install
pnpm dev             # start Next.js app and necessary local watchers
pnpm lint
pnpm typecheck
pnpm test            # unit/integration tests (local adapters if needed)
pnpm test:e2e        # Playwright tests; document prerequisites
pnpm build
pnpm assets:validate
pnpm db:migrate      # apply migrations to explicitly configured target
pnpm db:seed         # development/test ONLY; block in production
```

CI on PR: install frozen lockfile → lint → typecheck → unit tests → build → E2E subset with local test services → asset validation. Dependabot or similar dependency review is optional; audit high-severity issues before launch. Guard against accidentally running destructive seed/migrations against production.

## 15.3 Operations

- `/api/health` checks process readiness without exposing internals.
- Error tracking with personal-data scrubbing, structured request IDs.
- Production runbook includes deploy, preview environment, migration strategy, CDN cache invalidation, publish rollback and restore actions.
- Database backups tested through actual restore drill before accepting paying users.

---

<a id="sec-19"></a>

# 19. AUTHORITATIVE REFERENCE DOCUMENTATION

Consult official current documentation during implementation and verify version compatibility before coding; this spec intentionally does not pin framework version numbers.

- Next.js App Router / Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- React Three Fiber docs: https://r3f.docs.pmnd.rs/
- Three.js GLTFLoader and compression setup: https://threejs.org/docs/pages/GLTFLoader.html
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth with Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare R2 browser CORS: https://developers.cloudflare.com/r2/buckets/cors/
- Playwright documentation: https://playwright.dev/docs/intro
- Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/

---
