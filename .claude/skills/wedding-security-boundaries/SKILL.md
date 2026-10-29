---
name: wedding-security-boundaries
description: Security and privacy boundaries for Undangan AI Wedding World — tenant isolation and Supabase RLS, studio membership, invitation tokens and guest sessions, public manifest privacy, RSVP/guestbook abuse limits, media upload validation, CSRF/headers, secrets and log redaction. Load for any auth/session/token/RSVP/guestbook/upload/manifest/logging change and for every security review.
---

# wedding-security-boundaries

Source of truth: `architecture.md` §4.4, §14 and `api-contracts.md` §5.3, §7, §9. Principle: invitation token is a capability; publish is intentional; never leak other guests' details (`specs.md` §20).

## Tenant isolation
- RLS on every tenant-owned table; service-role client exists only server-side.
- Studio endpoints check the Supabase session **and** `wedding_members` role for the `wedding_id` taken from the route, never from the body.
- Cross-tenant or unknown IDs return `404` (no enumeration). User A can never read/update/publish user B's wedding (FR-11, §13.2, E2E-09).
- Membership switching across weddings must not contaminate state.

## Invitation tokens & guest sessions (`api-contracts.md` §5.3)
- Token: CSPRNG, ≥256 bits, base64url in `/i/[slug]?t=…`; store only SHA-256 hash; unique (`wedding_id`, `invite_token_hash`).
- Exchange route validates token + wedding + published status, sets `HttpOnly; Secure; SameSite=Lax` opaque session, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, then `303` to clean `/w/[slug]`. No token in logs, analytics or body; no third-party scripts on that route.
- Session bound to `wedding_id` + `guest_id`, expires after 30 days or on rotation, revocation re-checked on sensitive writes. Separate sessions per wedding in one browser.
- Plaintext token/link appears only in the create and rotate responses; never in list DTOs, logs or frontend storage. Studio warns that forwarding a link grants RSVP authority.

## Public surface
- Manifest and public endpoints: no guest lists, token hashes, draft media, signed preview URLs, private object keys, auth details or unrelated user IDs (`api-contracts.md` §7).
- Preview (`/studio/weddings/[id]/preview`) is member-only with short-lived signed GETs; preview credentials never land in shareable links.
- Anonymous visitors: read world + approved guestbook; RSVP/guestbook POST → `401` with friendly UX.

## Writes & abuse
- Zod validation + field allowlists on every write; byte and count quotas.
- RSVP: own guest only, upsert by (`wedding_id`,`guest_id`), party size 1..`max_party_size` attending / 0 declined, enforced server-side.
- Guestbook: 1–500 chars, ≤3 per guest per wedding, `pending` by default, public sees approved only, rendered as text (no HTML/scripts).
- Durable rate limiting (not in-memory only) on token exchange, RSVP, guestbook, upload and login-related routes.
- CSRF/origin check on cookie-authenticated mutations; CSP, referrer policy and secure cookie flags.
- User-supplied URLs (e.g. maps): `https:` only, trusted/validated hosts; reject `javascript:` and `data:`.

## Media (`api-contracts.md` §9.2, `architecture.md` §11.3)
- Presign scoped to the authorized wedding with a server-generated key, short expiry (~5 min), signed content type; CORS restricted to studio origins.
- `assets/complete` verifies actual bytes, size, type and checksum. JPEG/PNG/WebP only, ≤8 MB, ≤20 gallery images, **no SVG**; process, recompress and strip EXIF/location.
- Draft objects private; published assets promoted to controlled public keys; never delete assets referenced by active or rollback-eligible publications.

## Secrets & logs
- Only `NEXT_PUBLIC_*` reaches the browser. Never commit `.env*`; `.env.example` holds names only. Never print secret values.
- Logs and error tracking redact tokens, cookies, auth headers, private names/notes and message content; use request IDs.
- Audit log on publish, rollback, token rotation and moderation.

## Review checklist
For each changed file: tenant scope + RLS · membership/role · guest session + revocation · manifest/public DTO privacy · Zod validation and quotas · CSRF/origin · output encoding · URL allowlist · upload validation · rate limit · secrets server-only · log redaction · audit entry. Report each finding with severity CRITICAL / HIGH / MEDIUM / LOW.
