# Event Studio — Agent Guide

Mobile-first interactive 3D wedding invitations and a reusable multi-tenant studio CMS. Guests explore `entrance`, `living-room`, `wedding-garden`, and `reception-hall`; couples edit drafts and publish immutable wedding worlds.

## Source of truth

Read the relevant sections before changing behavior; load `spec-first` for FR/T/E2E traceability.

| Source | Authority |
| --- | --- |
| `specs.md` | Product scope, FR-01..FR-11 acceptance criteria (§6), tests (§13), gates (§16), task dependencies (§17) |
| `architecture.md` | Stack (§2), routes (§3), ownership (§4), data lifecycle (§5), engine (§8), assets (§11), budgets (§12), security (§14), operations (§15) |
| `api-contracts.md` | Invite tokens/sessions (§5.3), public manifest (§7), endpoints/errors/uploads (§9) |
| `docs/decisions.md` | Recorded decisions and explicitly accepted deviations; distinguish accepted, provisional, and open entries |
| `docs/progress.md` | Task status and verification evidence; check against the actual worktree |

Resolve disagreements using each source's authority and record genuine gaps in `docs/decisions.md`. Preserve acceptance criteria and stable section IDs. User instructions take precedence over local conventions.

This repository already has application code and a pnpm workspace. Do not repeat T-001/T-002 based on the historical greenfield note in `CLAUDE.md`. That file and `.claude/agents`/`.claude/commands` configure Claude; use this file with `.codex/` for Codex routing and `.opencode/` for OpenCode routing.

## Architecture and current constraints

- Next.js App Router in `apps/web`: `/w/*`, `/i/*`, `/studio/*`, `/api/*`. Inspect which planned routes and packages actually exist before changing them.
- TypeScript strict, pnpm/Turborepo, React/Tailwind, shared Zod contracts, Zustand transient state, Vitest and Playwright. Use installed versions and the lockfile; no incidental upgrades.
- `packages/world-engine` owns generic rendering/navigation and emits typed `WorldAction`s. Wedding entities and overlays belong in `packages/wedding-features`; API/manifest schemas belong in `packages/contracts`; tenant persistence belongs in `packages/database` when implemented.
- WebGL + React Three Fiber, client-only Canvas. Drei is deferred for the MVP (D-018); do not introduce WebGPU/TSL or Drei just because a shared Three.js skill illustrates them.
- Living room GLB source: `assets/source/joglo-interior/`; runtime mapping: `packages/world-engine/src/templates/blockout.ts`; served model: `apps/web/public/templates/joglo/1.0.0/living-room.glb`. Consult D-023/D-025 and `docs/asset-register.md` before changing geometry, node names, provenance, or distribution.
- Supabase Auth/Postgres/RLS and Cloudflare R2 are the target services. A fixture or local adapter is not evidence that real integration works.

## Invariants

- Public viewers consume published snapshots only. Draft edits require explicit Publish; promotion and validation precede the atomic active-publication pointer switch. Rollback moves the pointer.
- Public manifests exclude guest lists, token hashes, private keys, draft media, and signed preview URLs. Authenticate and authorize tenant access server-side; guest writes are scoped to their wedding and guest session.
- Invite tokens are bearer capabilities: hash at rest, clean 303 exchange redirect, no logging or client persistence. Keep secrets server-only; never print them or commit real `.env` files. `.env.example` contains variable names only.
- Every 3D hotspot has an accessible HTML equivalent. Essential event information, RSVP, and wishes remain reachable through 2D fallback. Cancel stale loads and release owned geometry, materials, textures, listeners, animation mixers, and frame loops without invalidating shared assets.
- Audio starts after a user gesture. Photo booth never requests a webcam or uploads by default. Art-dependent work remains `ENGINEERING_DONE / ART_PENDING` until sign-off and provenance requirements are satisfied.
- Code and identifiers are English; product copy and user-facing errors are Indonesian (`id-ID`), with `Asia/Jakarta` as the default IANA event timezone.
- V1 excludes payments, multiplayer, chat, AI-generated media, voice, freeform 3D editing, and webcam selfies unless the user explicitly changes scope.

## Agentic workflow

Use direct execution for small changes. For substantial implementation work with independent subtasks, delegate to the appropriate specialists in `.codex/agents/` (Codex) or `.opencode/agents/` (OpenCode); follow `.codex/workflows.md` or `.opencode/README.md`. The coordinator owns scope, integration, validation, and the final answer. Do not delegate merely to fill roles.

- `scout` (Pingot): read-only discovery, impact, diagnosis, research.
- `architect` (Bima): read-only design, plan, and specification consistency.
- `coder` (Zaki): implementation, fixes, refactors, performance.
- `qa` (Lulu): tests and verification; no production-code edits.
- `reviewer` (Sari): read-only correctness/security review.
- `documenter` (Nadia): docs, decisions, progress, comments.
- `devops` (Dimas): workspace, build, CI, migration/deployment tooling.

Parallelize independent reads or work with disjoint file ownership. Serialize dependent steps and shared-file edits. A subagent does not delegate further unless assigned to do so. Respect runtime limits and higher-priority instructions. If delegation is unavailable, perform the same relevant steps sequentially and disclose that limitation.

Continue authorized work through implementation, relevant tests, review, and fixes. Large tasks can use incremental phases without requiring approval at every phase. After two unsuccessful review/fix rounds, reassess the cause; avoid repeating the same loop. Ask only for missing decisions or actions outside the authorized scope. Review-only, analysis-only, and planning-only requests do not authorize implementation.

Check `git status` first and preserve existing user WIP. Do not revert, stage, commit, push, publish, deploy, or apply remote migrations unless the user's request authorizes that action. Delegation does not expand permissions.

## Skills

Project skills live in `.agents/skills/`. Fourteen domain/Three.js skills are relative symlinks to `.claude/skills/`, keeping one maintained source. OpenCode discovers both `.claude/skills` and `.agents/skills` automatically; do not duplicate them under `.opencode/skills`. Load only the relevant skills and references.

- Behavior/spec mapping: `spec-first`.
- App, API, data, workspace: `wedding-web-architecture`.
- Auth, tenants, invites, uploads, public data: `wedding-security-boundaries`.
- Viewer, navigation, avatar, scene/GLB lifecycle: `world-engine`, plus matching `threejs-fundamentals`, `threejs-interaction`, `threejs-animation`, `threejs-materials`, `threejs-textures`, `threejs-lighting`, `threejs-loaders`, `threejs-postprocessing`, or `threejs-shaders`.
- Client bundles/initial load: `next-bundle-optimizer`.
- Workflow entrypoints: `event-agentic`, `event-feature`, `event-bugfix`, `event-refactor`, `event-review`, `event-security`, `event-performance`, `event-document`, `event-comment`, `event-devops`, `event-analyze`, `event-solutioning`.

Shared skills describe target requirements as well as implemented behavior. Check decisions and code before assuming a pipeline, package, or service is available.

## Verification

Use actual scripts in `package.json`: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`. Run lint, typecheck, and relevant tests for code changes; build at milestones or when build behavior changes. Docs/config-only changes need format/schema/link/discovery checks, not unrelated application tests.

`pnpm assets:validate`, `pnpm db:migrate`, and `pnpm db:seed` currently invoke blocking placeholders. Read their scripts before using them; do not report placeholder results as successful validation. Seed only development/test targets.

Behavior tests should cite the FR/T/E2E ID and cover the main failure path. Do not weaken assertions to make a suite pass. Record only real command results, tested browsers/devices, and measured performance. Update `docs/progress.md` for affected tracked tasks; `DONE` requires the acceptance criteria and required verification. Report unrelated pre-existing failures separately.
