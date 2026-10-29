# UNDANGAN AI — WEDDING WORLD
## Product Requirements & Executable Specification

> **Document:** `specs.md`  
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

---

<a id="sec-0"></a>

# 0. AGENT EXECUTION CONTRACT — READ FIRST

The **three-file specification set** (`specs.md`, `architecture.md`, `api-contracts.md`) is the source of truth for the initial implementation. Build a reusable multi-tenant wedding invitation product, **not** a bespoke single-couple demo.

**Execution protocol:**

1. Read all three specification files, then inspect the existing repository before creating, replacing, or deleting anything. Preserve functioning code and respect existing conventions where they satisfy this specification.
2. Create `docs/progress.md` with task IDs, `NOT_STARTED | IN_PROGRESS | BLOCKED | DONE` status, evidence, and next action. Update it after each task. Create `docs/decisions.md` for any necessary deviations.
3. Implement tasks in the dependency order in Section 17 of this file, using the matching architecture and API contracts. Keep work in small, verifiable increments. Do not mark tasks `DONE` unless acceptance criteria and required tests pass.
4. **No silent scope cutting.** If a dependency, credential, 3D asset, or external service is unavailable: create a clearly labeled adapter or placeholder, record `BLOCKED` evidence, keep the rest working, and do not represent the blocked feature as production complete.
5. Run formatting, type checking, linting, relevant unit/integration/E2E tests, and a production build at each milestone. Fix failures before progressing, unless an externally blocked service is documented.
6. Never hardcode real couple, wedding, guest, RSVP, or tenant data in production paths. Seed data belongs only in development/test fixtures.
7. Favor small composable modules with typed contracts, explicit error handling, and tests over premature abstraction or broad refactors.
8. Do **not** implement payment, subscriptions, user-to-user multiplayer, realtime chat, AI-generated images/models, voice chat, a freeform 3D editor, or webcam selfie compositing in V1. They are explicitly out of scope.
9. When unspecified, use the defaults in [`architecture.md` §2](architecture.md#sec-2). Do not ask a question for every design choice. Escalate only when safe implementation truly requires access, paid infrastructure, licensed assets, or an irreversible product decision.
10. Report final delivery with: completed task IDs; live routes; tests run/results; deployment requirements; known limitations/blockers; screenshots or recordings of the mobile user journey if testing tools allow them.

**Definition of complete:** All feature acceptance criteria in Section 6, security requirements in [`architecture.md` §14](architecture.md#sec-14), QA gates in Section 16, and launch checklist in Section 18 are met. A functioning mock with primitive 3D geometry is a **prototype**, not a complete art-approved launch.

---

<a id="sec-1"></a>

# 1. PRODUCT VISION

**Undangan AI Wedding World** is a mobile-first interactive 3D wedding invitation delivered through a browser link, usually shared through WhatsApp. A wedding guest enters a stylized 3D world, moves between rooms/venues, reads the couple's story, enjoys a virtual avatar photo booth, views event information, RSVPs, and leaves a guestbook message. Couples customize and publish their own worlds through a web CMS.

## 1.1 Goals

- G-01: Guests can reach critical event information without getting trapped in game mechanics.
- G-02: One engine and a configurable world template support many couples with strict tenant data isolation.
- G-03: At least four connected scenes provide a clear, playful storytelling experience.
- G-04: Smooth usable experience on mid-range mobile devices; an accessible 2D fallback for unsupported devices.
- G-05: Couples can independently edit, preview, publish, and manage invitations and guests.
- G-06: Secure and reliable RSVP/guestbook operations with no public guest-list exposure.

## 1.2 Primary personas

- **Anonymous visitor:** Opens public wedding URL without invitation token; views public world, story, approved messages, event details, and photo booth, but cannot RSVP or submit guestbook by default.
- **Invited guest:** Opens personalized invitation link; same experience plus prefilled identity, RSVP and guestbook access. No account required.
- **Couple owner/editor:** Authenticates to studio; creates wedding, edits content and appearance, manages guests, previews draft, publishes.
- **Platform admin:** Operational support and template management; least-privilege access, no default unrestricted UI in V1.

## 1.3 The 11 mandatory features

| ID | Feature | Priority |
|---|---|---|
| FR-01 | 3D entrance with couple names | P0 |
| FR-02 | Living Room with interactive photo gallery | P0 |
| FR-03 | Interactive book about couple's journey | P0 |
| FR-04 | Inter-room navigation | P0 |
| FR-05 | Event information and RSVP | P0 |
| FR-06 | Virtual photo booth with wedding avatars | P1 |
| FR-07 | Guest character/avatar | P1 |
| FR-08 | Wedding Garden and Reception Hall | P0 |
| FR-09 | Digital guestbook and wishes | P0 |
| FR-10 | Couple-selectable scenes/decorations | P1 |
| FR-11 | Per-couple Wedding World CMS | P0 |

P0 = required for a functional wedding invitation; P1 = required for **V1 completion**, not for the early pilot MVP.

---

<a id="sec-6"></a>

# 6. FEATURE REQUIREMENTS & ACCEPTANCE CRITERIA

Each feature includes **implementation**, **acceptance criteria**, and **failure cases**. Test desktop and mobile behavior.

## FR-01 — Entrance with couple names

**Implementation:** Initial 3D scene with sign/front gate, couple names from published manifest, welcome UI, start prompt, accessible 2D link, optional muted ambient audio toggle. Entry camera and one door portal to Living Room.

**Acceptance:**
- [ ] Opening `/w/[slug]` for a published wedding displays the correct names and theme; no hardcoded sample content.
- [ ] Initial loading UI appears until entrance is interactable.
- [ ] Door interaction transitions to Living Room, and `Quick Map` also works.
- [ ] Unsupported WebGL or failed asset load produces 2D invitation, not blank page.
- [ ] Music never auto-plays audibly before explicit user consent/gesture.

**Failures:** Unknown slug -> 404; unpublished wedding -> private/not-found response; broken scene asset -> user-facing error and 2D fallback.

## FR-02 — Living Room photo gallery

**Implementation:** Scene contains at least three photo-frame hotspots mapped to media IDs. Click opens HTML lightbox/gallery carousel; responsive image, caption, close, keyboard/touch controls.

**Acceptance:**
- [ ] Couple can upload/reorder at least three and up to 20 gallery images in CMS.
- [ ] Each frame displays configured thumbnail/cover, and opens correct gallery selection.
- [ ] Next/previous/close functions on touch and keyboard; focus is managed.
- [ ] Missing or removed image uses designed fallback without crashing scene.
- [ ] No unpublished private media URL is leaked by the public viewer.

## FR-03 — Interactive love-story book

**Implementation:** Clickable 3D book emits `open_story`, camera gently eases to book, React dialog renders chapter list/pages with image, title, body, optional date, swipe/arrow controls; meaningful content remains regular DOM text.

**Acceptance:**
- [ ] Minimum 1, maximum 30 story chapters per wedding.
- [ ] Couples can add/edit/reorder/remove chapters through studio and preview changes without publishing.
- [ ] Public viewer always displays last published chapter sequence.
- [ ] Progress within the open book and previous/next navigation work on mobile.
- [ ] Closing returns to same scene and usable camera/movement state.
- [ ] Reduced-motion mode disables large cinematic effects.

## FR-04 — Navigation between rooms

**Implementation:** Scene state machine, tap-to-move, bounded navigable surface/navmesh or simple waypoint pathing, door portals, quick navigation menu, loading indicator, camera controller. No full page reload on normal scene transitions.

**Acceptance:**
- [ ] All four scenes reachable through scene map; appropriate portals connect primary flow.
- [ ] A tap on navigable floor moves avatar or visible navigation marker; no movement through walls/furniture.
- [ ] Scene transition handles rapid double taps and cancels stale requests without duplicate controllers.
- [ ] Camera transitions and movement work on common touch gestures without conflict with page scroll.
- [ ] Scene dispose releases per-scene geometry/materials/textures not referenced elsewhere; no accumulating listeners/RAF loops.
- [ ] Back/forward navigation works consistently with overlay state and browser history strategy.

## FR-05 — Event details and RSVP

**Implementation:** HTML event cards with ceremony/reception details, timezone-correct dates, venue/address, safe Maps links; invited guest RSVP accepts `attending/declined`, party size for attending, optional short note. Upsert by guest ID.

**Acceptance:**
- [ ] Studio can create at least ceremony and reception, including time, address and map link.
- [ ] Event details available from global UI without navigating to a specific hotspot.
- [ ] Dates/times are displayed in correct wedding IANA timezone and on Android/iOS.
- [ ] Personalized guest sees name and RSVP status; can create then edit RSVP.
- [ ] Party size integer 1..`guests.max_party_size` for attending; declined stores 0; no client-only validation.
- [ ] Same guest cannot create duplicate RSVP rows; repeated requests are idempotent for equivalent payloads.
- [ ] Anonymous visitor cannot RSVP; clear invitation-only message rather than a broken form.
- [ ] Studio dashboard reports invitation count, attending count, declined count, pending count and total attending party size accurately.

## FR-06 — Virtual photo booth

**Implementation:** In Garden, photo booth hotspot opens camera pose UI. Use wedding couple character models and selected guest avatar in a **virtual 3D posed composition**. User chooses 1 of at least 3 poses and 1 of at least 3 frame variants, inputs optional display label and clicks capture. Render to offscreen WebGL target/read pixels or equivalent robust method, compose label/frame in 2D canvas, export PNG locally.

**Acceptance:**
- [ ] Works without requesting webcam permission.
- [ ] Downloaded PNG shows all 3 avatars, selected pose, frame, wedding name/date and guest label if supplied.
- [ ] Supported desktop/mobile devices can download/share via browser-supported method; graceful `Download` fallback.
- [ ] On export failure (context lost, allocation, asset CORS), show recoverable error; do not crash world.
- [ ] The image is not uploaded or publicly shared by default; explain behavior in UI.
- [ ] Photo booth uses owned/licensed models and explicitly tagged animation names.

## FR-07 — Guest avatar

**Implementation:** Choose among 3–5 avatar presets with low-poly GLB and `idle`, `walk`, `interact/pose` animation mapping. Optional name label local-only for booth. Single avatar in local world; no multiplayer network service.

**Acceptance:**
- [ ] Guest can choose/change preset through a simple avatar picker.
- [ ] Avatar appears in scenes, follows pathing and changes `idle/walk` animations correctly.
- [ ] Selection survives reload on same browser with local non-sensitive storage.
- [ ] Any unavailable preset falls back to default without broken model.
- [ ] Runtime has one animation controller per active avatar and cleans up on unmount.

## FR-08 — Wedding Garden & Reception Hall

**Implementation:** Both scenes loaded using same engine and manifest contract; Garden hosts ceremony and booth; Hall hosts reception, RSVP and guestbook. No special-case one-off code that prevents new templates.

**Acceptance:**
- [ ] Both scenes open from quick map and from configured hotspots/portals.
- [ ] Scene-specific decor/style uses wedding theme; can return to other scenes.
- [ ] Event/RSVP/guestbook/booth actions open correct overlays.
- [ ] Three scene changes in succession do not lose avatar/theme or break canvas.

## FR-09 — Guestbook and digital wishes

**Implementation:** Invited guest submits one or more messages (limit 3 per guest per wedding for V1) with length 1–500 characters, status `pending` by default; owner/editor approves/hides. Public read includes only approved entries, sorted newest, cursor-paginated.

**Acceptance:**
- [ ] Invited guest can post a message; anonymous visitor is restricted by default.
- [ ] Message is not publicly visible until approved.
- [ ] Studio can approve/hide entries and see pending count.
- [ ] API and display escape/sanitize text and reject HTML/scripts where relevant; no XSS.
- [ ] Server rate limit and max-count restriction prevent basic flooding.
- [ ] Pagination works; guests cannot access private entries or author-sensitive data.

## FR-10 — Scene and decoration selection

**Implementation:** Couples choose from one world template (V1), at least two coherent palette options, at least two lighting presets, and at least **six predefined decoration slots** with ≥2 variants each. Slots are authored in GLB with stable identifiers, not arbitrary 3D placement.

**Acceptance:**
- [ ] CMS lists allowed palette/lighting/decor variants from template catalog.
- [ ] Selecting a variant updates private live preview without publish.
- [ ] Publishing locks resolved configuration in versioned manifest.
- [ ] Invalid/deprecated variant IDs are rejected or migrated explicitly, never silently crash viewer.
- [ ] Switching an asset variant does not leak old texture/material references.
- [ ] All sample variants render on mobile benchmark devices.

## FR-11 — Per-couple CMS (multi-tenant)

**Implementation:** Authenticated studio with Create Wedding wizard, content editor, gallery upload, story chapter editor, events editor, guest import/manual add, personalized invite link generation, guestbook moderation, template/decor editor, draft preview, publish, status/version history, rollback, wedding link copy, RSVP dashboard.

**Acceptance:**
- [ ] User A cannot view/update user B's wedding even by guessing IDs or API calls.
- [ ] One account can own/edit multiple weddings; membership enforced per wedding.
- [ ] Draft edits are not reflected in the published world until explicit Publish.
- [ ] Preview shows latest draft and private draft media only to authorized members.
- [ ] Publish validates required content/assets, assigns monotonic version, and activates atomically.
- [ ] Rollback restores prior manifest while preserving drafts and audit history.
- [ ] If two editors overwrite same revision, second write gets conflict feedback.
- [ ] Guest invitation links can be copied/rotated, and dashboard reads real RSVP data.
- [ ] Loading, empty, offline, validation and permission error states are designed, not raw stack traces.

---

<a id="sec-10"></a>

# 10. CMS FUNCTIONAL SCREENS

## 10.1 Wizard and editor

1. **Create Wedding:** title, slug validation, couple names, timezone, pick initial template.
2. **Overview:** published/draft state, public URL, completion checklist, RSVP summary.
3. **Couple & Events:** names, welcome text, ceremony/reception entries, addresses, external map links.
4. **Gallery:** asset upload, alt text, caption, reorder, delete with reference checks.
5. **Storybook:** chapter CRUD with ordering, optional date/media, 5000-character body max per chapter.
6. **World Decor:** palette, lighting, six decoration slots; preview applies private draft state only.
7. **Guests & RSVP:** manual guest add, CSV import (optional V1 enhancement; if implemented validate row count and duplicates), copy invite link, revoke/rotate, RSVP summary.
8. **Guestbook Moderation:** pending/approved/hidden, approve/hide actions, pagination.
9. **Preview & Publish:** preview full experience, prepublish validation warnings/errors, confirmation, version history, rollback.

## 10.2 CMS acceptance for non-engineers

- Empty states explain the next action.
- Validation errors displayed beside inputs, not only toast.
- Unsaved changes warning and explicit save/publish distinction.
- Preview opens authorized draft and never accidentally exposes preview credentials in shared public links.
- `Publish` is disabled when required fields/scenes/assets are missing; show exactly what must be fixed.
- A member invited to multiple weddings can switch without data contamination.
- Studio must be usable with keyboard for forms; 3D editor controls can be supplemented with regular select inputs.

---

<a id="sec-13"></a>

# 13. TEST STRATEGY

## 13.1 Unit tests (Vitest or established equivalent)

- Manifest Zod parsing/invalid action/invalid portal/missing required nodes.
- Event time formatting across `Asia/Jakarta` and non-Jakarta timezones.
- Scene state machine transitions; cancellation/rapid switch behavior.
- Action registry type-to-handler mappings.
- Theme/decor compatibility and unknown-variant handling.
- RSVP validation including party bounds and declined party size zero.
- Guestbook text length/status transitions and output encoding.
- Publish version selection, optimistic revision and rollback semantics.

## 13.2 Integration tests

- Tenant A cannot read/edit/publish tenant B.
- Guest A cannot modify guest B RSVP or read guest B's private data.
- Invalid/expired/revoked token cannot create guest session; old token invalid after rotation.
- New token sets cookie and redirects to URL with no token; request logs and external links do not expose it.
- Public manifest never contains draft media or private guest data.
- Draft edits invisible publicly until publish; rollback restores old publication.
- Invalid media upload and expired presigned URL are rejected safely.
- Guestbook pending never appears in public endpoint until approved.
- Publish failure during asset preparation does not switch active version.
- Concurrent editor saves produce 409 and preserve saved data.

## 13.3 Browser E2E tests (Playwright)

At minimum:

- E2E-01: Create wedding -> enter details -> publish -> open public invitation.
- E2E-02: Entrance -> Living Room -> open story -> change chapter -> close.
- E2E-03: Gallery lightbox navigation and keyboard escape.
- E2E-04: Scene map navigates all four scenes; return to entrance.
- E2E-05: Personalized guest token -> guest session -> RSVP attending -> edit to declined.
- E2E-06: Guest submits wish -> unseen public -> admin approves -> visible public.
- E2E-07: Decor edit -> draft preview changes -> public unchanged -> publish changes.
- E2E-08: Avatar selection -> enter photo booth -> pose/frame -> downloadable PNG.
- E2E-09: Another account cannot access different wedding CMS/API.
- E2E-10: Force WebGL disabled/asset failure -> useful 2D fallback.
- E2E-11: Reload persists avatar selection; no private RSVP details leak.
- E2E-12: Mobile touch/viewport test with safe areas and no blocking controls.

When external credentials are unavailable, use contract tests with isolated local adapters plus clearly flagged integration tests requiring real environment. Mocks do not count as real storage/auth integration passes.

## 13.4 Manual device matrix

- Android Chrome (mid-range hardware), Samsung Internet, iPhone Safari (modern iOS), desktop Chrome/Firefox/Safari where available.
- Test inside WhatsApp in-app browser where possible; note browser/OS/version in evidence.
- Throttled network, screen rotation, background/resume, low memory, storage restriction, denied media permissions (no webcam should be requested), portrait narrow screens, keyboard-only, reduced motion, WebGL unsupported.
- Perform at least 10 scene switches and three photo exports; observe memory/failure state.

---

<a id="sec-16"></a>

# 16. DEFINITION OF DONE / RELEASE GATES

## 16.1 Gate A — Prototype (not production)

- [ ] Simple 3D blockout of Entrance + Living Room.
- [ ] Click a door, transition scenes, click a book, display story overlay.
- [ ] Mobile browser works without blank screen.
- [ ] Code lint/typecheck/tests/build pass.

## 16.2 Gate B — Functional MVP

- [ ] Four scene graph works and quick navigation present.
- [ ] Couple/gallery/story/events come from valid wedding data, not hardcoded source.
- [ ] RSVP and guestbook persist in database with security checks.
- [ ] Studio can create, preview and publish wedding.
- [ ] Personal guest invitation flow and revocation work.
- [ ] 2D fallback covers core information and forms.
- [ ] At least two distinct wedding tenants pass isolation tests.

## 16.3 Gate C — V1 Complete

- [ ] All 11 features meet the acceptance criteria in Section 6 of this file.
- [ ] Guest avatar/booth export works on mobile and desktop.
- [ ] Theme/decor previews/publish work; at least six validated slots.
- [ ] Real optimized/licensed art for all four scenes and 3–5 avatars; asset register complete.
- [ ] Performance targets measured and documented; regressions triaged.
- [ ] Security and privacy checklist done; E2E suite and release build pass.
- [ ] Three pilot weddings have been run using separate real content sets (with permission), and critical issues resolved.

---

<a id="sec-17"></a>

# 17. EXECUTION ROADMAP — ATOMIC TASK CHECKLIST

**Task statuses in `docs/progress.md`:** `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Each task must record evidence: PR/commit, test command/result, screenshot, migration ID or runbook entry as relevant. **Do not mark tasks done solely from code generation.**

## Milestone 0 — Feasibility & repository foundation (target weeks 1–2)

- [ ] **T-001** Audit repository, record present stack and constraints. Depends: none.
- [ ] **T-002** Initialize pnpm workspace, app, shared packages, strict TS, formatting/linting, CI skeleton. Depends: T-001.
- [ ] **T-003** Set up first React Three Fiber canvas, placeholder Entrance scene, responsive/mobile canvas boundary. Depends: T-002.
- [ ] **T-004** Add placeholder Living Room and scene manager with safe transition/loading/failure states. Depends: T-003.
- [ ] **T-005** Implement raycast hotspot registry, clickable door and storybook overlay vertical slice. Depends: T-004.
- [ ] **T-006** Test vertical slice on touch/mobile, document baseline FPS/loading/blockers. Depends: T-005.

**Gate A:** T-001 through T-006 pass. Stop architectural expansion until basic interaction works on a phone.

## Milestone 1 — Data/auth, reusable engine (target weeks 3–4)

- [ ] **T-101** Configure Supabase local/dev, SQL migrations and seed; create tenant schema and indexes. Depends: T-002.
- [ ] **T-102** Implement studio login/session, member middleware and SQL RLS policies; write cross-tenant tests. Depends: T-101.
- [ ] **T-103** Implement `WeddingManifestV1Schema` and strict template/action schemas; add fixtures and contract tests. Depends: T-004.
- [ ] **T-104** Implement `world-engine` scene/nav/asset/quality/camera modules with deterministic cleanup and error handling. Depends: T-005, T-103.
- [ ] **T-105** Implement public manifest read endpoint and immutable publication storage model. Depends: T-101, T-103.
- [ ] **T-106** Implement private draft data and optimistic revision control. Depends: T-101, T-102.
- [ ] **T-107** Implement R2 draft/published storage adapter, upload signing, verification and local development adapter. Depends: T-102.
- [ ] **T-108** Implement core accessible UI/dialog layout + 2D fallback skeleton. Depends: T-003.

## Milestone 2 — Content vertical slice (target weeks 5–6)

- [ ] **T-201** Finish Entrance name/welcome and responsive status/audio controls. Depends: T-104, T-105.
- [ ] **T-202** Finish Living Room frames/gallery with published media and draft-only authorized preview. Depends: T-104, T-107, T-108.
- [ ] **T-203** Finish interactive storybook, chapter CRUD/schema and story editor. Depends: T-104, T-106, T-108.
- [ ] **T-204** Finish four-scene navigation core: tap-to-move, portal/spawn logic, quick map, history policy. Depends: T-104.
- [ ] **T-205** Implement CMS create wedding wizard, metadata editor and gallery upload. Depends: T-102, T-106, T-107.
- [ ] **T-206** Implement preview manifest generation and authorized draft preview. Depends: T-106, T-202, T-203.

## Milestone 3 — Event and guest services (target weeks 7–8)

- [ ] **T-301** Implement Garden/Hall scenes, ceremony/reception interactions and fallback content. Depends: T-204.
- [ ] **T-302** Implement event editor, timezone correct viewer and Maps link validation. Depends: T-205.
- [ ] **T-303** Implement guest creation/invite token hashes/secure token exchange/sessions/revocation. Depends: T-101, T-102.
- [ ] **T-304** Implement guest-session-scoped RSVP UI/API, validation, aggregates and tests. Depends: T-303, T-302.
- [ ] **T-305** Implement guestbook creation/moderation/public approved list/pagination/tests. Depends: T-303.
- [ ] **T-306** Implement publish pipeline with asset promotion, validation, versioning/rollback, and failure recovery. Depends: T-105, T-106, T-107, T-205.
- [ ] **T-307** Run cross-tenant, RSVP, draft/publish and guestbook E2E tests. Depends: T-301..T-306.

**Gate B:** Four-scene invitation, CMS, secure guest flows and publish are functional even if visual assets are still prototypes.

## Milestone 4 — Avatars & virtual photography (target weeks 9–10)

- [ ] **T-401** Integrate guest avatar presets, selection persistence, idle/walk pose mapping. Depends: T-204, artist assets.
- [ ] **T-402** Hook avatar movement to navmesh/waypoints and camera follow; profile mobile. Depends: T-401.
- [ ] **T-403** Integrate couple avatars, three pose presets and booth environment. Depends: T-301, artist assets.
- [ ] **T-404** Implement offscreen capture, PNG frame/name composition, local download/share, recoverable errors. Depends: T-403, T-107 (public asset CORS).
- [ ] **T-405** Write booth E2E/manual QA including no webcam access and context-loss recovery. Depends: T-404.

## Milestone 5 — Theme customization & studio completeness (target weeks 11–12)

- [ ] **T-501** Formalize scene template catalog/GLB node naming, six decoration slots and allowed variants. Depends: T-103, artist asset deliverables.
- [ ] **T-502** Implement palette/lighting/decor selection with draft preview and manifest validation. Depends: T-501, T-206.
- [ ] **T-503** Finish CMS RSVP dashboard, guests workflow, guestbook moderation, publish management/rollback UX. Depends: T-304, T-305, T-306.
- [ ] **T-504** Add template/asset validation CLI, optimized models/textures and license register. Depends: T-501.
- [ ] **T-505** End-to-end verification that decor changes remain draft until publish, rollback restores older look. Depends: T-502, T-503.

## Milestone 6 — Hardening & pilot (target weeks 13–16; allow longer if art/device issues)

- [ ] **T-601** Implement adaptive quality, scene preloading budgets and memory-release regression test. Depends: T-204, T-401.
- [ ] **T-602** Complete responsive/accessible 2D fallback for all non-booth core actions. Depends: T-302, T-304, T-305.
- [ ] **T-603** Complete RLS/security abuse tests, rate limits, logging redaction, production CSP/CORS. Depends: T-307.
- [ ] **T-604** Finish Playwright suite E2E-01..12, run real-device matrix and record evidence. Depends: T-505, T-602, T-603.
- [ ] **T-605** Complete runbook, backups/restore drill, publishing rollback rehearsal and deployment. Depends: T-604.
- [ ] **T-606** Run three distinct wedding pilot configurations; fix critical defects and validate scene asset licenses. Depends: T-605, artist signoff.

**Gate C:** All 11 features production-ready per Section 16.3.

## 17.1 Effort estimates (planning only)

- Engineering: **98–152 engineer-days** (~588–912 focused engineering hours, assuming 6 hours/day).
- 3D art/optimization: **25–45 artist-days** for adaptation of available licensed assets; significantly more if fully bespoke.
- Team assumption: **2 capable TypeScript/3D web engineers + 1 part-time/full-time 3D artist**, overlapping work; initial target 14–20 calendar weeks for full V1, with uncertainty.
- Solo developer + freelance artist: preliminary 24–36 weeks. Re-estimate after Gate A performance prototype and asset audit.
- Estimates exclude major new template sets, production marketing site, commercial billing, and AI-powered features.

---

<a id="sec-18"></a>

# 18. RELEASE CHECKLIST & HANDOFF ARTIFACTS

Before launch, verify:

- [ ] No real secrets in repository, test fixtures, browser code, or client logs.
- [ ] Production migrations applied in staging and rollback strategy understood.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm assets:validate` pass (record commands and output).
- [ ] At least one wedding can be created via UI, published, opened via generic link, and accessed by personalized invite link.
- [ ] Public data is versioned and draft/published isolation confirmed.
- [ ] Guest tokens can be rotated; invalid token fails; RSVPs and wishes are tenant-scoped.
- [ ] All four real environment assets + avatar models optimized and licensed.
- [ ] Photo booth produces a valid PNG on target Android/iOS devices without webcam access.
- [ ] No critical console errors, blank canvas, broken navigation, or blocked critical content on mobile.
- [ ] Guestbook moderation, rate limiting, inaccessible draft assets and safe Maps links verified.
- [ ] 2D mode covers essential invitation flow.
- [ ] Backup/restore and publication rollback operationally tested.
- [ ] Responsive UI checked in portrait, narrow viewport, and Safari/WhatsApp browser where feasible.
- [ ] Performance evidence, current known limitations, and user-facing privacy notice recorded.

**Required handoff files:**

```text
specs.md
architecture.md                  # System architecture and operations
api-contracts.md                 # HTTP and manifest contracts
README.md                         # setup/deploy/commands
.env.example
supabase/migrations/*
docs/progress.md
                          # task status + evidence
docs/decisions.md                # explicit decisions/deviations
docs/asset-register.md           # model origin, ownership/license
docs/runbook.md                  # deployment/recovery/rollback
scripts/validate-assets*
e2e/*
```

At the end, coding agent must produce a factual completion report containing:

```text
IMPLEMENTATION REPORT
- Milestone reached: Gate A / Gate B / Gate C
- Completed task IDs:
- Remaining or blocked task IDs + reasons:
- App routes and startup instructions:
- Environment variables and external credentials required:
- Database migrations applied:
- Tests actually run and their results:
- Devices/browsers actually tested:
- Production art/license status:
- Known bugs / performance figures / risks:
- Next recommended task:
```

---

<a id="sec-20"></a>

# 20. FINAL DESIGN PRINCIPLES

1. **Wedding content is data, not code.** One production template should work with any wedding record.
2. **3D is an enhancement, not a blocker.** Guests must always reach date, location, RSVP and wishes.
3. **Publish is intentional.** No automatic exposure of private draft edits or media.
4. **Invitation token is a capability.** Treat it as sensitive; never leak other guests' details.
5. **Asset lifecycle is part of correctness.** A scene that renders once but leaks GPU resources on transitions is not finished.
6. **Prototype is not production art.** Engineering completeness and art/license readiness must both be tracked.
7. **Tests are acceptance evidence.** Do not declare a feature done based on visually plausible screenshots alone.
8. **Finish the vertical slice first:** `Entrance → Door → Living Room → Book → Story Overlay → Close`. Then extend the reusable engine.

**END OF PRODUCT SPECIFICATION — implement against all three documents, their numbered contracts and checklists.**
