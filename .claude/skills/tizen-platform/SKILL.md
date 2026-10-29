---
name: tizen-platform
description: Samsung Tizen platform layer — samsung-tizen app (patricia_app_tizen) adapters, flutter-tizen build/run/deploy, tizen-manifest, env files, and the forked video_player_avplay plugin (AVPlay quirks, local modification, pigeon). Load for work in samsung-tizen/ or video_player_avplay/, player/device issues, or TV builds.
---

# tizen-platform

## samsung-tizen/ (`patricia_app_tizen`)
A thin shell. There are no screens or routes here; they all come from `flutter-core`.
- `lib/main.dart`:
  - picks the env from the build mode: `dotenv.load('.prod.env' | '.dev.env')` via a local `kReleaseMode`;
  - builds `MqttConfig.production(...)`;
  - calls `PatriciaLibFlutter.init(...)`;
  - runs `MaterialApp.router(routerConfig: router)` under `BlocProvider<InternetConnectionCubit>`.
- Adapters that implement flutter-core interfaces:
  - `lib/platform_detail_data_source_impl.dart` implements `PlatformDetailDataSource`, through the MethodChannel `com.patricia/device_info` handled in `tizen/DeviceInfoMethodChannel.cs`.
  - `lib/video_player_avplay_impl.dart` (main/bumper) and `lib/video_player_ads_avplay_impl.dart` (ads) implement `VideoPlayerPlatformDataSource`.
  - `lib/video_player_mock_impl.dart` and `lib/video_player_ads_mock_impl.dart` are the mocks. The switch is `lib/cores/constants/video_player_config.dart`. Tizen reports Linux, so it uses AVPlay even in debug builds.
- Env keys, from `lib/cores/constants/app_const.dart`: `API_BASE_URL`, `KEY_GALLERY_HASHING`, `BUMPER_ASSETS_PATH`, `MQTT_BROKER_URL`, `MQTT_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD`. Never print their values.
- `tizen/tizen-manifest.xml`:
  - app id `com.telkomsel.patricia.tizen`, `api-version="9.0"`, profile `tv-samsung`;
  - privileges internet, network.get, external/media storage, `drmplay`, filesystem read/write, `appmanager.launch`.
- The legacy native player `tizen/VideoPlayerMethodChannel.cs` / `NativeVideoPlayer.cs` is fully commented out. Do not revive it.

## Toolchain (target Flutter 3.47.8 / Dart 3.13.7)
- `flutter-tizen` does **not** use `~/flutter`. It runs its own pinned Flutter.
  - Local install: `/Users/snpmac003/Downloads/development/flutter-tizen`, commit `3862cc3`.
  - Its `bin/internal/flutter.version` points to Flutter **3.47.1** / Dart 3.13.1.
  - The host `~/flutter` is 3.47.8 and is only used for `flutter-core` tests.
- Latest flutter-tizen release: `3.47.5-tizen.1.0.1` (Flutter 3.47.5). No release is built on 3.47.8 yet, so TV binaries are still affected by GHSA-frr6-h895-5pxp (`specs.md` SEC-03 / OPEN-09).
- Upgrade only on an explicit task:
  1. `flutter-tizen upgrade`
  2. `flutter-tizen --version` must show Flutter ≥ 3.47.8
  3. `flutter-tizen pub get`
  4. `flutter-tizen build tpk`
  5. Smoke test on a real TV
- `samsung-tizen/.dart_tool/version` shows the Flutter that last resolved the app. It is currently 3.47.1.
- `FadeUpwardsPageTransitionsBuilder` in `lib/main.dart` moved to `widgets.dart` in 3.41 and is still re-exported by Material, so no change is needed for 3.47.x.

## Build / run (inferred from local tooling; the repo README is the Flutter template)
```bash
cd samsung-tizen
flutter-tizen --version      # bundled Flutter; must be ≥ 3.47.8 for a release (currently 3.47.1)
flutter-tizen pub get
sdb connect <TV_IP> && flutter-tizen devices
flutter-tizen run            # debug → .dev.env
flutter-tizen run --release  # release → .prod.env
flutter-tizen build tpk      # → tizen/bin/<cfg>/tizen80/com.telkomsel.patricia.tizen-1.0.0.tpk
```
- Signing uses the active Tizen Studio certificate profile.
- The API level is not aligned: manifest 9.0, `tizen_dotnet_project.yaml` 10.0, `Runner.csproj` `tizen80`. AVPlay ships one prebuilt `.so` per Tizen version, so build one TPK per target version.
- `assets/images/` is declared in pubspec but missing on disk. `pubspec.lock` is gitignored.

## video_player_avplay/ (fork of flutter-tizen plugin 0.7.7)
- Tizen TV only, and it does **not** run on the emulator. It cannot coexist with `video_player`.
- Limits:
  - `httpHeaders` only supports Cookie and User-Agent.
  - `seekTo` snaps to a keyframe and only works at speed 1.0.
  - `setLooping` only works for assets.
  - DASH needs `formatHint: VideoFormat.dash`.
- **Local modification**, documented in `MODIFICATIONS.md`:
  - `VideoPlayerController.pause()` no longer calls native pause (`_applyPlayPause`), which avoids `PlatformException(Pause, ...)` during dispose.
  - Use `pauseNative()` for a real pause; the Tizen impl already does this.
  - Every further change to the plugin must be logged in `MODIFICATIONS.md`.
- Pigeon:
  - The API is defined in `pigeons/messages.dart` and generates `lib/src/messages.g.dart`, `tizen/src/messages.{h,cc}`.
  - Regenerate with `dart run pigeon --input pigeons/messages.dart`. This command is inferred; the repo does not document it.
- Native code is in `tizen/src/`: `plus_player.cc` (DASH/HLS), `media_player.cc` (MMPlayer), `drm_manager*` (PlayReady/Widevine; not used by Patricia).

## Known runtime behavior
- Content is local progressive MP4. End of video is detected by a 500 ms polling timer.
- On each switch the old controller is disposed in the background ("Disposing old controller in background").
- A downloaded bumper can fail with `File format not supported`. It then falls back to the asset bumper `assets/videos/bumper_offline.mp4`.
