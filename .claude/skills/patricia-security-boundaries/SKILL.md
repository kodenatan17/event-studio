---
name: patricia-security-boundaries
description: Security boundaries for the Patricia TV client — device tokens, refresh flow, gallery signature verification, env secrets packed in the .tpk, sensitive logs. Load for any auth/token/network/storage/download/logging change and for every security review.
---

# patricia-security-boundaries

## Tokens & auth
- Access and refresh tokens come from `claim-token` and `refresh-token`. They are stored in Hive (`cores/services/hive_service.dart`, `auth_session_box`) and loaded by `ApiService.initializeTokens()`.
- On 401 there is exactly one shared refresh in flight (`_refreshInFlight`), then a retry. Do not add a parallel refresh path.
- Handle business codes the way `SyncCampaignCubit` does: `CMP40100` refreshes, while `CMP40101` / `CMP40000` stop.
- Device identity: the Tizen ID is hashed to a UUID with SHA-256 in `auth_repository_impl.dart`. Do not send the raw ID.

## Content integrity
- Every gallery file must pass verification before play: the file exists, the size equals `fileSize`, and the SHA256withECDSA signature over `galleryId|sha|fileSize` is valid. The check is done by `features/video_player/helpers/hashing_helper.dart` (pointycastle) with the public key `pubKeyGalleryHashing`, which the app passes from env `KEY_GALLERY_HASHING`.
- Never bypass, weaken or "temporarily" skip this check. A failed item is dropped and re-downloaded.

## Secrets & logs
- `.dev.env` / `.prod.env` (samsung-tizen) are gitignored, but they are declared as Flutter assets, so they ship in plain text inside the `.tpk`.
  - Never add new secrets there.
  - Never print or commit their values.
- Never log tokens, `Authorization` headers, MQTT credentials or pre-signed MinIO URLs. `appPrint*` is debug-only, but the Chucker inspector (`cores/utils/chucker_interceptor.dart`) shows requests on screen.
- `/issue-logs.txt` contains real JWTs, session tokens, signed URLs and device/org IDs. Do not quote, copy or paste from it; refer to line numbers only.
- MQTT uses TLS on 8883 (`MqttConfig.production`). Do not downgrade to plain or `ws` in production config.

## TLS & toolchain (rules SEC-01..03 in `/specs.md` §4.10)
- **Known open issue (OPEN-08, HIGH):** in `flutter-core/lib/cores/services/mqtt/mqtt_service.dart`, `onBadCertificate` returns `true` for 8883 and wss, so any broker certificate is accepted.
  - Do not copy this pattern anywhere.
  - Do not "fix" it in passing. It needs a decision on the broker CA (public vs on-prem internal → normal validation or CA pinning).
  - A review that touches MQTT must flag it as HIGH.
- Never add a `badCertificateCallback` / `onBadCertificate` that returns `true`, a permissive `HttpOverrides`, or a Dio `IOHttpClientAdapter` that skips validation, not even "for testing".
- **SDK baseline:** release builds need Flutter ≥ 3.47.8 / Dart ≥ 3.13.7, because of [GHSA-frr6-h895-5pxp](https://github.com/dart-lang/sdk/security/advisories/GHSA-frr6-h895-5pxp) (compromised eMudhra CAs; `dart:io` TLS can be forged).
  - The TV build uses flutter-tizen's bundled Flutter, currently 3.47.1. The latest flutter-tizen release is on 3.47.5, so it is still affected (OPEN-09).
  - Check with `flutter-tizen --version` before any release build, and report the version in every security review.
- `flutter-core` is still resolved with Flutter 3.38.10 (`.dart_tool/version`, OPEN-10). The host SDK is already 3.47.8.

## Out of scope
- DRM: the `drmplay` privilege is declared but Patricia plays plain MP4.
- Dashboard RBAC and backend authorization are outside this workspace.

## Review checklist
Check each item for the changed code:
- token handling and storage;
- the 401 path;
- no hardcoded URL or secret (use env / `PatriciaLibFlutter.init` params);
- no sensitive logging;
- signature check intact;
- no new certificate-validation bypass, and the status of OPEN-08 noted;
- Flutter/Dart version of the build: flutter-tizen ≥ 3.47.8, else flag OPEN-09;
- AVPlay controllers and stream controllers disposed (see `tizen-platform`).
