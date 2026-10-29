---
name: patricia-playback-engine
description: Map of the campaign playback engine in flutter-core — MQTT action → campaign sync → showtime filter → playlist/spotRepeat → back-to-back → bumper → GalleryPlayBloc → evidence. Load for any work on playlist rules, showtime, spotRepeat quota, back-to-back separators, bumper or playback state.
---

# patricia-playback-engine

Full explanation: `flutter-core/lib/docs/campaign_playback.md`. Read the section you need; §10 says where to change a rule and §11 maps rule → code → test. Business rules and IDs live in `/specs.md`; load `spec-first` too.

## Components (paths relative to `flutter-core/lib/`)
| Component | File | Role |
|---|---|---|
| `MqttDeviceActionBloc` | `features/commons/presentation/bloc/mqtt_device_action/` | Parses MQTT `action` into states |
| `VideoPlayerScreen` | `features/video_player/presentation/video_player_screen.dart` | Wires MQTT states to the blocs and cubits; D-pad left/right |
| `SyncCampaignCubit` | `features/video_player/presentation/cubits/sync_campaign/` | Fetches campaign details (retry by CMP code), saves them to DB, downloads galleries |
| `CampaignShowtimeHelper` | `features/video_player/helpers/campaign_showtime_helper.dart` | 1-hour period and showtime relevance |
| `PlaylistGenerator` | `features/video_player/helpers/playlist_generator.dart` | Builds cycles (pure, no I/O) |
| `SpotRepeatHelper` | `features/video_player/helpers/spot_repeat_helper.dart` | Quota per hour; `adjustAvailable` |
| `BackToBackHelper` | `features/video_player/helpers/back_to_back_helper.dart` | Same-industry detection and separator choice |
| `GalleryPlayBloc` | `features/video_player/presentation/blocs/gallery_play/gallery_play_bloc.dart` | Playback state machine: `_startPeriod`, `_buildBatch`, `_completeCycle`, `_consumeEndedSpot`, `_resolveBumperPath` |
| `EvidenceCubit` / `EvidenceSchedulerHelper` | `features/video_player/presentation/cubits/evidence/`, `helpers/evidence_scheduler_helper.dart` | Play log, screenshot at duration/2, upload every `AppConfig.durationEvidenceLogUploading` min |

## Invariants that must not break
- MQTT `finish` never deletes a campaign immediately. The campaign finishes at the end of the running cycle (`ScheduleFinishCampaignEvent`).
- `insertCampaign` is `INSERT OR REPLACE`: the local columns `order`, `available_spot_repeat` and `spot_repeat_period` are read back and preserved.
- A campaign is playable only when every gallery has a `local_path`. Each item is validated (file exists, size, signature) before play.
- A quota spot is consumed only at end of play of the last gallery of a Commercial occurrence, and is persisted before the next item.
- Changing a rule means changing its test, named with the rule ID.

## Tests (run in `flutter-core/`)
```bash
flutter test test/features/video_player/helpers
flutter test test/features/video_player/presentation/blocs/gallery_play
```
Manual check on a TV: compare the `[gallery_play_bloc] ... next cycle:` log lines with the examples in `/specs.md`. Other log prefixes are listed in `campaign_playback.md` §10.
