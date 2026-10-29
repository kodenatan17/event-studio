# Patricia TV workspace — Claude Code

Patricia is a Digital Signage / DOOH ad platform. This workspace holds the **Samsung Tizen TV player**:
- the device pairs by QR;
- it receives campaigns over MQTT;
- it downloads and verifies video assets;
- it plays an hourly showtime playlist (Non-Commercial + Commercial with spotRepeat, back-to-back separation, bumper);
- it reports Proof of Play.

Background: `HLD Patricia - 5.3.md` (§5.9 Apps Playback). Business rules for the app: **`specs.md`**.

## Packages
| Folder | Package | Role |
|---|---|---|
| `flutter-core/` | `patricia_lib_flutter` 0.0.1 | **All** screens, flows and business logic: Clean Architecture per feature (`auth`, `splash`, `commons`, `video_player`), BLoC/Cubit, get_it, dartz `Either`, Dio, Hive + SQLite, MQTT. Platform-agnostic. |
| `samsung-tizen/` | `patricia_app_tizen` 1.0.0+1 | Thin Tizen shell. Path-depends on `../flutter-core` and `../video_player_avplay`. Loads the env, calls `PatriciaLibFlutter.init(...)`, and provides the platform adapters (device info MethodChannel, AVPlay main/ads players, mocks). |
| `video_player_avplay/` | `video_player_avplay` 0.7.7 | Fork of the flutter-tizen AVPlay plugin (C++ in `tizen/src/`, Pigeon API). The only local change is listed in `MODIFICATIONS.md`. |

Out of scope here:
- `patricia-dashboard-development/` (Next.js CMS) and `technical-documentation/` (specs/AC). Each has its own `AGENTS.md`; treat `technical-documentation/` as read-only reference.
- `.claude/next-bundle-optimizer/` and `.claude/claude-plugin/` are Next.js leftovers and unused for the TV app.

## Toolchain — target Flutter 3.47.8 / Dart 3.13.7
Flutter **3.47.8** is the latest stable release. It is a security hotfix for [GHSA-frr6-h895-5pxp](https://github.com/dart-lang/sdk/security/advisories/GHSA-frr6-h895-5pxp): compromised eMudhra intermediate CAs let an attacker on the network forge TLS certificates for `dart:io` HTTPS/TLS. Every Patricia connection is affected: Dio API calls, MinIO downloads, and MQTT over TLS.

Current state, as of 2026-10-26:

| Where | Version | Evidence |
|---|---|---|
| Host SDK (`~/flutter`), used for `flutter-core` tests | 3.47.8 / Dart 3.13.7 ✅ | `flutter --version` |
| `flutter-core` last resolved with | **3.38.10** ⚠️ | `flutter-core/.dart_tool/version`; `pubspec.lock` needs Flutter ≥ 3.38.4 / Dart ≥ 3.10.3 |
| `samsung-tizen` (TV build) via flutter-tizen | **3.47.1** / Dart 3.13.1 ⚠️ vulnerable | flutter-tizen commit `3862cc3`, `bin/internal/flutter.version` |
| Latest flutter-tizen release | `3.47.5-tizen.1.0.1` (Flutter 3.47.5) ⚠️ still vulnerable | no flutter-tizen release on 3.47.8 yet |
| Project template | 3.32.4 | `.metadata` revision `6fba244` |

- The Dart constraint stays `sdk: ^3.8.1` in both pubspecs. It is compatible with 3.47.8; raising it is a separate decision.
- **The TV build cannot reach 3.47.8 until flutter-tizen ships it.** Until then, `samsung-tizen` binaries are affected. This is tracked in `specs.md` OPEN-09.
- Upgrade checklist (do not run without an explicit task; it changes lockfiles and generated code):
  1. `cd flutter-core && flutter pub get`
  2. `dart run build_runner build --delete-conflicting-outputs`, plus the mocks
  3. `flutter test`
  4. When available: `flutter-tizen upgrade` to a release built on Flutter ≥ 3.47.8, then confirm with `flutter-tizen --version`
  5. `cd samsung-tizen && flutter-tizen pub get && flutter-tizen build tpk`
  6. Smoke test on a real TV: pairing, MQTT connect, download, playback
  - `samsung-tizen/lib/main.dart` uses `FadeUpwardsPageTransitionsBuilder`, which moved to `widgets.dart` in 3.41 and is still re-exported by Material. No change is needed there.

## How it fits together
- App start in `samsung-tizen/lib/main.dart`:
  1. `dotenv` picks `.prod.env` in release/profile builds and `.dev.env` in debug.
  2. It builds `MqttConfig.production(...)`.
  3. It calls `PatriciaLibFlutter.init(baseUrl, bumperVideoPath, platform/video adapters, mqttConfig, pubKeyGalleryHashing)`.
  4. It runs `MaterialApp.router(routerConfig: router)`.
- Routes in `flutter-core/lib/cores/navigations/app_router.dart`: `/splash` → `/auth` (QR pairing) or `/video-player`.
- D-pad/remote keys are handled in `flutter-core/lib/cores/widgets/root_screen_wrapper.dart` and `.../video_player/presentation/video_player_screen.dart`.
- Playback engine walkthrough (MQTT → sync → showtime → playlist → back-to-back → player): `flutter-core/lib/docs/campaign_playback.md`.

## Commands
```bash
# flutter-core — host Flutter (`~/flutter`, 3.47.8)
cd flutter-core
flutter test                                   # or a path: test/features/video_player/helpers
dart run build_runner build --delete-conflicting-outputs                                  # .g.dart are gitignored
dart run build_runner build --delete-conflicting-outputs --build-filter="test/generator/**" # mocks
dart analyze                                   # no analysis_options.yaml; only analysis_options.yaml.sonar

# samsung-tizen — flutter-tizen uses its own pinned Flutter (currently 3.47.1), not ~/flutter
# real TV only: AVPlay does not run on the emulator
cd samsung-tizen
flutter-tizen --version                        # check the bundled Flutter before release builds
flutter-tizen pub get
sdb connect <TV_IP> && flutter-tizen devices
flutter-tizen run [--release]
flutter-tizen build tpk

# video_player_avplay: regenerate Pigeon after editing pigeons/messages.dart (inferred, not documented)
dart run pigeon --input pigeons/messages.dart
```

## Working rules
- **Spec first.** Behavior must follow a rule ID in `specs.md`. Never invent business rules; anything unresolved goes to `specs.md` §8 (OPEN).
- **Rule changes need tests** named with the rule ID (`'[6] spotRepeat = 2 ...'`, `'[Case 3] ...'`) in `flutter-core/test/features/video_player/helpers/` or the `gallery_play` bloc test.
- **Where to change what:**
  - logic and UI go in `flutter-core/`;
  - platform adapters go in `samsung-tizen/lib/`;
  - change the plugin only when the task requires it, and log the change in `video_player_avplay/MODIFICATIONS.md`.
- Mirror the nearest existing file (datasource → repository → usecase → bloc → screen, DI in `<feature>_di.dart`). No new packages unless required.
- Smallest change that works. Run `dart analyze` and the relevant `flutter test` path before finishing.
- Don't touch user WIP: the package repos often have uncommitted changes. Never revert or reformat files you weren't asked to change.

## Agents & routes
This session is the orchestrator. Subagents live in `.claude/agents/` (edit them directly):
- `scout` (Pingot, read-only research)
- `architect` (Bima, design / spec validation)
- `coder` (Zaki)
- `qa` (Lulu, tests)
- `reviewer` (Sari, review + security)
- `documenter` (Nadia)
- `devops` (Dimas, Tizen build/sign)

Slash commands in `.claude/commands/`: `/feature` · `/bugfix` · `/refactor` · `/review` · `/security` · `/performance` · `/document` · `/comment` · `/devops` · `/analyze` · `/solutioning`.
- Each command runs one specialist per step through the Agent tool, with a reviewer → coder fix loop of at most 2 rounds.
- Small tasks may be done directly.

## Skills (`.claude/skills/`)
Load the relevant one before working in its area.

| Skill | Use for |
|---|---|
| `spec-first` | Any behavior change: resolve to a rule ID in `specs.md` and its AC source |
| `patricia-core-architecture` | Code in `flutter-core/` (layers, DI, errors, storage, naming, tests) |
| `patricia-playback-engine` | Playlist, showtime, spotRepeat, back-to-back, bumper, `GalleryPlayBloc`, evidence |
| `tizen-platform` | `samsung-tizen/`, `video_player_avplay/`, TV build/deploy, AVPlay issues |
| `patricia-security-boundaries` | Tokens, network, storage, downloads, logging; every security review |

## Gotchas
- **Generated files:** `.g.dart` and mocks (`test/generator/mock_generator.mocks.dart`) are not committed. Run build_runner after a fresh clone.
- **AVPlay pause:** `video_player_avplay` `pause()` no longer pauses natively (see `MODIFICATIONS.md`). Use `pauseNative()` for a real pause.
- **Controller churn:** each video gets a new controller and the old one is disposed in the background. End of video is detected by a 500 ms polling timer.
- **API version:**
  - The values disagree: `tizen-manifest.xml` 9.0, `tizen_dotnet_project.yaml` 10.0, csproj `tizen80`.
  - AVPlay ships one `.so` per Tizen version.
- **samsung-tizen project files:**
  - `assets/images/` is declared in pubspec but missing.
  - `pubspec.lock` is gitignored.
  - `test/widget_test.dart` is the broken Flutter template.
- **Security (open, not yet fixed — see `specs.md` §4.10 and §8):**
  - **MQTT TLS accepts any certificate.** In `flutter-core/lib/cores/services/mqtt/mqtt_service.dart`, `onBadCertificate` always returns `true`, for both 8883 and wss. TLS is encrypted but not authenticated, so a man-in-the-middle can impersonate the broker. An SDK upgrade does **not** fix this (OPEN-08).
  - **SDK below 3.47.8.** The TV build (flutter-tizen 3.47.1) is affected by GHSA-frr6-h895-5pxp for HTTPS API calls and downloads (OPEN-09).
  - When touching TLS code, never add `badCertificateCallback` / `onBadCertificate` returning `true`, or a permissive `HttpOverrides`.
- **Secrets:**
  - `.dev.env` / `.prod.env` are packed into the `.tpk` as assets. Never print their values or add secrets to them.
  - `issue-logs.txt` contains real tokens and signed URLs. Don't quote it.
- **Language:** user-facing messages (`flutter-core/lib/cores/errors/mapping_message.dart`) and docs are in Indonesian; code identifiers are in English.
