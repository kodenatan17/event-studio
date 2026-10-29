---
name: patricia-core-architecture
description: Architecture and conventions of flutter-core (package patricia_lib_flutter) — Clean Architecture per feature, BLoC/Cubit, manual get_it DI, dartz Either, ApiService, Hive/SQLite, tests with mockito/bloc_test. Load before finding, designing, writing or reviewing code in flutter-core/.
---

# patricia-core-architecture (flutter-core)

All screens, flows and business logic of the TV app live in `flutter-core/lib/`. The platform app (`samsung-tizen/`) only injects adapters.

## Layout
```
lib/patricia_lib_flutter.dart   barrel + PatriciaLibFlutter.init(...)
lib/cores/                      constants, data_sources (platform interface), di, errors, models,
                                navigations (go_router), services (api, hive, dblocals, mqtt), utils, widgets
lib/features/{auth,commons,splash,video_player}/
  data/{data_sources/{interfaces},models,repositories}
  domain/{entities,repositories,usecases}
  presentation/{blocs|bloc,cubits|cubit,widgets/{atoms,molecules,organisms}}
  <feature>.dart  <feature>_di.dart
lib/docs/campaign_playback.md   playback engine doc (Indonesian)
```

## Chain to mirror (example: auth, initiate QR)
1. Interface `features/auth/data/data_sources/interfaces/auth_remote_data_source.dart`
2. Impl `.../auth_remote_data_source_impl.dart`: calls `ApiService` and throws `HttpException` / `ServerException`
3. Model `.../data/models/initiate_qr_request_model.dart`: `@JsonSerializable`, `fromEntity` / `toEntity()`
4. Repository: `domain/repositories/auth_repository.dart` is the interface, `data/repositories/auth_repository_impl.dart` maps exceptions to `Left(Failure)`
5. Use case `domain/usecases/initiate_qr_usecase.dart`: a single `call()` that returns `Either<Failure, T>`
6. Bloc `presentation/blocs/initiate_qr/` with `_bloc` / `_event` / `_state` as `part` files, and states Initial / Loading / Success / Failure
7. Screen `presentation/auth_screen.dart`: `MultiBlocProvider` with `di<XxxBloc>()`

## Cross-cutting
- **DI**:
  - `cores/di/main_di.dart` (`final di = GetIt.instance`) calls `authDI()`, `splashDI()`, `commonsDI()` and `videoPlayerDI()`.
  - Use cases are lazy singletons and blocs are factories. `MqttDeviceActionBloc` is a lazy singleton.
  - Players use the named instances `mainVideoPlayer` / `adsVideoPlayer`, and their repositories `mainVideoRepository` / `adsVideoRepository`.
  - `AppConfig.shouldUseMock` swaps in the `*_remote_data_source_mock.dart` classes.
- **Network**:
  - `cores/services/api_service.dart` wraps Dio with a 10 s timeout.
  - Bearer token comes from Hive, with one shared refresh in flight on 401 and a retry. Public endpoints skip auth.
  - Endpoints live in `cores/constants/api_endpoints.dart`.
- **Errors**:
  - `cores/errors/exception.dart`: `HttpException` carries `statusCode` and the business `code`, e.g. `CMP40101`.
  - `cores/errors/failure.dart` defines the Failure types.
  - User-facing text comes from `cores/errors/mapping_message.dart` (Indonesian).
- **Storage**:
  - Hive (`cores/services/hive_service.dart`, keys in `hive_constants.dart`).
  - SQLite through `cores/services/dblocals/` (tables in `app_database_tables.dart`).
  - A schema change means: bump `AppConfig.dBLocalVersion` (`cores/constants/app_config.dart`) and add a migration in `_onUpgrade`.
- **Logging**: `appPrint` / `appPrintWarning` / `appPrintError` (`cores/utils/app_print_util.dart`, debug only), with a `[ClassName][method]` prefix.
- **Routing**: `cores/navigations/app_router.dart` defines `/splash`, `/auth` and `/video-player`. Screens are wrapped by `cores/widgets/root_screen_wrapper.dart`, which also handles D-pad keys.

## Naming
- Files are snake_case: `*_impl.dart`, `*_mock.dart`, `*_model.dart`, `*_entity.dart` (Equatable).
- Use cases: auth, commons and splash use `*_usecase.dart` / `XxxUseCase`; video_player uses `*_uc.dart` / `XxxUc`. Follow the feature you are in.
- Barrels: `<feature>.dart`, `bloc.dart`, `helpers.dart`, `widgets/index.dart`.

## Toolchain
- Target is Flutter **3.47.8** / Dart **3.13.7**. That is the host `~/flutter`, and it is the security hotfix release (see `patricia-security-boundaries`).
- The package was last resolved with **3.38.10** (`.dart_tool/version`); `pubspec.lock` needs Flutter ≥ 3.38.4 / Dart ≥ 3.10.3 (`specs.md` OPEN-10).
- The first `flutter pub get` on 3.47.8 rewrites `pubspec.lock`. Only do that on an explicit upgrade task, then run build_runner and the full `flutter test`.
- `environment: sdk: ^3.8.1` stays as it is; raising it is a separate decision.

## Commands (run in `flutter-core/`)
- `flutter test <path>`, plus `flutter test --coverage` when coverage is needed
- `dart run build_runner build --delete-conflicting-outputs`: `.g.dart` files are gitignored and must be generated
- Mocks: add the class to `test/generator/mock_generator.dart`, then run `dart run build_runner build --delete-conflicting-outputs --build-filter="test/generator/**"`
- `dart analyze`: there is no `analysis_options.yaml`, only `analysis_options.yaml.sonar` (flutter_lints)

## Rules
- Mirror the nearest existing file; no new frameworks or packages unless the task requires them.
- Never swallow errors: map them to a Failure and show them through `mapFailureToMessage`.
- Tests mirror `lib/` under `test/` and use mockito (`generator/mock_generator.mocks.dart`), `bloc_test` and `fake_async`.
