# UNDANGAN AI — WEDDING WORLD
## API & Published Manifest Contracts

> **Document:** `api-contracts.md`  
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


**Contract rules:** HTTP contracts and the public published manifest defined here must be implemented using shared Zod schemas in `packages/contracts`, with server-side authorization and tenant isolation as defined in [`architecture.md`](architecture.md). Functional behavior and end-to-end assertions are governed by [`specs.md`](specs.md). The example URLs and guest names in fixtures are illustrative, not production values.

---

<a id="sec-5-3"></a>

# 5.3 INVITATION TOKENS AND SESSIONS

1. On guest creation generate a cryptographically secure random token **≥256 bits**; store its SHA-256 hash only; use base64url encoding in links.
2. Generate personalized link `/i/[slug]?t=TOKEN`. `GET /i/[slug]` validates token, wedding, and published status. Use `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, no raw token logs/analytics, then set a scoped signed opaque guest session using `HttpOnly; Secure; SameSite=Lax` cookie and redirect 303 to `/w/[slug]` with no token in URL.
3. Guest session must be authenticated server-side to `wedding_id` + `guest_id`, expire after 30 days or on explicit token rotation, and be revocable via guest/invitation status. Store only an opaque session identifier or signed short-lived session marker in cookie; re-check revocation on sensitive writes.
4. Only the invited guest's own RSVP can be created/updated. Guestbook is associated with that guest ID. Do not return other guests' names, tokens, email, attendance or private notes in any public API.
5. Support separate browser sessions per wedding without overwriting one another; scope cookie name/path appropriately or use a session lookup keyed by wedding. Test opening invitations from two weddings in the same browser.
6. Without a token, a guest can read the public world and approved guestbook; RSVP and guestbook POST return an authorization-required response and show a friendly UX.
7. Invite links are capabilities: include clear warning in studio that forwarding a personalized link grants its holder the invitee's RSVP authority. Support regenerating/revoking tokens.

**Privacy:** In studio display only necessary guest data, avoid collecting email/phone unless a feature requires it, provide a documented data deletion/export operation, and strip EXIF/location metadata from publicly served photos.

---

<a id="sec-7"></a>

# 7. PUBLIC MANIFEST CONTRACT

**Important:** The public manifest is an immutable snapshot of publishable data; never include guest lists, invitation token hashes, draft media, authentication details, user IDs unrelated to public features, or internal storage credentials.

Example (illustrative URL hosts; substitute actual configured CDN):

```json
{
  "schemaVersion": 1,
  "publicationVersion": 1,
  "wedding": {
    "slug": "romeo-juliet",
    "title": "Romeo & Juliet",
    "couple": { "groom": "Romeo", "bride": "Juliet" },
    "timezone": "Asia/Jakarta",
    "locale": "id-ID"
  },
  "world": {
    "templateId": "classic-garden",
    "templateVersion": "1.0.0",
    "entrySceneId": "entrance",
    "theme": {
      "paletteId": "ivory-gold",
      "lightingId": "warm-daylight",
      "decorations": {
        "entrance.arch": "jasmine",
        "entrance.lantern": "classic",
        "living.sofa": "cream",
        "living.table": "oak",
        "garden.flowers": "white-rose",
        "hall.centerpiece": "gold"
      }
    },
    "scenes": [
      {
        "id": "entrance",
        "assetUrl": "https://cdn.example.com/templates/classic-garden/v1/entrance.glb",
        "navmeshUrl": "https://cdn.example.com/templates/classic-garden/v1/entrance-nav.glb",
        "cameraPreset": "entry",
        "portals": [
          { "id": "front-door", "toSceneId": "living-room", "spawnPointId": "from-entrance" }
        ],
        "hotspots": [
          { "id": "welcome-sign", "nodeName": "HS_WELCOME", "action": "open_welcome" }
        ]
      },
      {
        "id": "living-room",
        "assetUrl": "https://cdn.example.com/templates/classic-garden/v1/living.glb",
        "navmeshUrl": "https://cdn.example.com/templates/classic-garden/v1/living-nav.glb",
        "cameraPreset": "entry",
        "portals": [
          { "id": "garden-door", "toSceneId": "wedding-garden", "spawnPointId": "from-living" },
          { "id": "hall-door", "toSceneId": "reception-hall", "spawnPointId": "from-living" }
        ],
        "hotspots": [
          { "id": "story-book", "nodeName": "HS_STORY", "action": "open_story" },
          { "id": "photo-frame-01", "nodeName": "HS_GALLERY_01", "action": "open_gallery", "payload": { "startIndex": 0 } }
        ]
      },
      {
        "id": "wedding-garden",
        "assetUrl": "https://cdn.example.com/templates/classic-garden/v1/garden.glb",
        "navmeshUrl": "https://cdn.example.com/templates/classic-garden/v1/garden-nav.glb",
        "cameraPreset": "entry",
        "portals": [ { "id": "back-to-living", "toSceneId": "living-room", "spawnPointId": "from-garden" } ],
        "hotspots": [ { "id": "photo-booth", "nodeName": "HS_PHOTO", "action": "open_photo_booth" } ]
      },
      {
        "id": "reception-hall",
        "assetUrl": "https://cdn.example.com/templates/classic-garden/v1/hall.glb",
        "navmeshUrl": "https://cdn.example.com/templates/classic-garden/v1/hall-nav.glb",
        "cameraPreset": "entry",
        "portals": [ { "id": "back-to-living", "toSceneId": "living-room", "spawnPointId": "from-hall" } ],
        "hotspots": [
          { "id": "rsvp-booth", "nodeName": "HS_RSVP", "action": "open_rsvp" },
          { "id": "wish-book", "nodeName": "HS_GUESTBOOK", "action": "open_guestbook" }
        ]
      }
    ]
  },
  "gallery": [
    { "id": "gallery-1", "src": "https://cdn.example.com/weddings/romeo-juliet/photo1.webp", "alt": "Couple at the seaside", "caption": "Our first trip" }
  ],
  "story": [
    { "id": "chapter-1", "title": "Pertama Bertemu", "body": "Kisah kami dimulai...", "imageSrc": null, "order": 0 }
  ],
  "events": [
    {
      "id": "ceremony-1",
      "kind": "ceremony",
      "title": "Akad Nikah",
      "startsAt": "2027-02-14T02:00:00Z",
      "endsAt": "2027-02-14T04:00:00Z",
      "timezone": "Asia/Jakarta",
      "venueName": "Example Wedding Garden",
      "address": "Alamat contoh",
      "mapsUrl": "https://maps.google.com/?q=Example"
    }
  ],
  "features": {
    "guestbookEnabled": true,
    "rsvpEnabled": true,
    "photoBoothEnabled": true
  }
}
```

## 7.1 Contract validation rules

- Create `WeddingManifestV1Schema` in `packages/contracts`; all manifests parsed with Zod on publication and at viewer boundary.
- Provide explicit `schemaVersion` with migration/compatibility policy; viewer must show recoverable error for unsupported future versions.
- Scene IDs/portal targets must resolve to a listed scene; every `hotspot.action` must be in the registered action allowlist.
- Scene asset URLs are generated from trusted template catalog and approved CDN; CMS must not accept arbitrary executable or cross-origin asset URLs.
- The manifest includes only published media URLs; no unpublished draft object key or signed preview URL.
- Stable 3D authored node names (`HS_*`, `DECOR_*`, `SPAWN_*`) must be checked by asset validation script before a template is marked active.
- Use a published manifest GET response with `ETag` and cache policy; immutable publication versions may cache long-term, while the active pointer must revalidate promptly after publish.

---

<a id="sec-9"></a>

# 9. API CONTRACTS

**Prefix:** `/api` (except invitation exchange under `/i/:slug`). All requests/responses JSON except presigned upload and binary media operations. Zod request validation, structured errors, CSRF/origin protection for cookie-authenticated mutations, no raw internal exceptions.

Unified error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input tidak valid",
    "details": [{ "path": "partySize", "reason": "OUT_OF_RANGE" }],
    "requestId": "req-example"
  }
}
```

**Status semantics:** `200` read/update, `201` create, `204` delete, `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` not found (also use to avoid cross-tenant enumeration), `409` revision/data conflict, `413` oversized media, `415` unsupported media type, `422` well-formed invalid business state, `429` rate-limited, `500` internal error.

## 9.1 Public endpoints

| Method/Route | Request | Response / rules |
|---|---|---|
| `GET /api/public/weddings/:slug` | none | Sanitized active manifest and public display data; `404` on absent/unpublished; ETag |
| `GET /api/public/weddings/:slug/guest-session` | session cookie | `{ authenticated, guest?: { displayName, maxPartySize }, rsvp?: {...} }`; do not expose token |
| `GET /api/public/weddings/:slug/guestbook?cursor=&limit=` | `limit` 1..30 | Approved-only `{items, nextCursor}` |
| `GET /api/public/weddings/:slug/rsvp` | guest session | Own RSVP or null; `401` without session |
| `PUT /api/public/weddings/:slug/rsvp` | `{attendance:'attending'|'declined',partySize:number,note?:string}` | Upsert own RSVP, normalized server response |
| `POST /api/public/weddings/:slug/guestbook` | `{message:string}` | Creates `pending`, returns own submission ID/status; limit 3 |
| `GET /i/:slug?t=...` | token query | Validate, set guest session, redirect clean URL; never return token in body |

For invitation routing, Next.js Route Handler `app/i/[slug]/route.ts` is the authority. The route must disable intermediary caching and minimize token exposure in diagnostics.

## 9.2 Studio endpoints

All endpoints below require authenticated studio user, membership verification and CSRF/origin handling. Mutations return normalized DTOs; filter `wedding_id` against session and never trust client-provided ownership.

| Method/Route | Behavior |
|---|---|
| `GET/POST /api/studio/weddings` | List accessible wedding summaries / create draft wedding |
| `GET/PATCH /api/studio/weddings/:id` | Get metadata / update title/slug/timezone (with optimistic revision where applicable) |
| `GET/PUT /api/studio/weddings/:id/draft` | Read/write draft JSON; require `expectedRevision` |
| `GET/POST/PATCH/DELETE /api/studio/weddings/:id/story...` | CRUD chapters, reorder (atomic order update) |
| `GET/POST/PATCH/DELETE /api/studio/weddings/:id/events...` | CRUD events; validate event date order and map URL |
| `GET/POST/PATCH/DELETE /api/studio/weddings/:id/gallery...` | Gallery ordering and published asset references |
| `POST /api/studio/weddings/:id/assets/presign` | Issue short-lived upload URL for approved MIME/purpose/key |
| `POST /api/studio/weddings/:id/assets/complete` | Verify uploaded object size/type/checksum and start processing |
| `GET/POST /api/studio/weddings/:id/guests` | Paginated guest list / create guest, return new invite link **once** |
| `POST /api/studio/weddings/:id/guests/:guestId/rotate-token` | Revoke old invitation, return new token/link **once** |
| `GET /api/studio/weddings/:id/rsvps` | Paginated RSVPs and aggregate statistics |
| `GET /api/studio/weddings/:id/guestbook` | All statuses (authorized member only), paginated |
| `PATCH /api/studio/weddings/:id/guestbook/:entryId` | Change moderation to approved/hidden |
| `GET /api/studio/weddings/:id/preview` | Auth-only draft-derived manifest + signed private preview URLs |
| `POST /api/studio/weddings/:id/publish` | Validate/promote assets, snapshot, atomically activate, return `{version, publishedUrl}` |
| `GET /api/studio/weddings/:id/publications` | Version list |
| `POST /api/studio/weddings/:id/rollback` | `{publicationId}` reactivates earlier valid snapshot |
| `GET /api/health` | Process readiness; no secret values |

**Specific details:**

- Studio IDs are UUID; client cannot create arbitrary authoritative IDs or storage keys.
- Any guest link returned on initial creation/rotation is a sensitive capability; do not put plaintext token in standard guest-list read response, log it or persist it in frontend storage.
- The publish endpoint should accept `expectedDraftRevision` and optional idempotency key; concurrent publishes must be serialized per wedding and produce no duplicate active versions.
- Validate uploaded file by actual bytes/metadata, not only claimed Content-Type. Image upload limits: maximum 8 MB per source image, up to 20 gallery images; allow JPEG/PNG/WebP, process into web-compatible compressed formats and strip metadata. Reject SVG from user uploads for V1.
- Presigned PUT URLs should expire quickly (example 5 minutes) and sign expected content type; browser CORS allowlist restricted to configured studio origins. Never expose R2 access keys in browser.
- Implement an adapter for server-based rate limiting (prefer durable managed backing store in production, not an in-memory-only process map).

---
