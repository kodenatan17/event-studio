# Patricia TV App — Specs (Solutioning)

> **Scope:** aturan bisnis client TV (Samsung Tizen) yang diimplementasikan di `flutter-core/` (`patricia_lib_flutter`) dan dijalankan oleh `samsung-tizen/` (`patricia_app_tizen`).
> **Bukan** dokumen teknis. Detail implementasi ada di [`flutter-core/lib/docs/campaign_playback.md`](flutter-core/lib/docs/campaign_playback.md).
> **Status:** Draft, disusun dari AC sprint 5.2/5.3, HLD 5.3, dan perilaku kode/test saat ini (26 Okt 2026).
> **Baseline platform:** Flutter **3.47.8** / Dart **3.13.7** (security hotfix GHSA-frr6-h895-5pxp). Lihat §4.10 dan OPEN-09.

---

## Daftar isi
1. [Sumber kebenaran](#1-sumber-kebenaran)
2. [Scope](#2-scope)
3. [Glosarium](#3-glosarium)
4. [Rule ber-ID](#4-rule-ber-id)
5. [Kontrak API (ringkas)](#5-kontrak-api-ringkas)
6. [Kontrak platform](#6-kontrak-platform)
7. [Traceability rule → kode → test](#7-traceability-rule--kode--test)
8. [OPEN / konflik](#8-open--konflik)
9. [Proses menambah / mengubah rule](#9-proses-menambah--mengubah-rule)

---

## 1. Sumber kebenaran

Jika ada perbedaan, urutan prioritasnya:

| # | Sumber | Path |
|---|---|---|
| 1 | Acceptance Criteria sprint 5.3 (Apps) | `technical-documentation/docs/sprint_5/sprint_5.3/acceptance_criteria/Apps/` — `Campaign Playlist.md`, `Campaign Back to Back.md`, `Campaign Showtime.md` |
| 2 | Acceptance Criteria sprint 5.2 (Apps) | `technical-documentation/docs/sprint_5/sprint_5.2/acceptance_criteria/Apps/` — QR, connection status, `Organization/bumper-default.md`, `Campaign/*`, `Device/*` |
| 3 | HLD 5.3 | `HLD Patricia - 5.3.md` §5.9 Apps Playback, §5.10 Monitoring, §7.2 Security, §8 Open Items |
| 4 | Solutioning apps sprint 4 (legacy, AWS) | `technical-documentation/docs/sprint_4/solutioning/apps/` |
| 5 | Implementasi saat ini | `flutter-core/lib/docs/campaign_playback.md` + test di `flutter-core/test/` |

Jika sumber 1–3 berbeda dengan kode, perbedaan itu dicatat di [§8](#8-open--konflik). Konflik tidak diselesaikan sepihak di kode.

---

## 2. Scope

**Masuk scope:**
- device pairing via QR dan sesi device;
- MQTT command;
- sinkronisasi campaign dan download asset;
- playlist per showtime (Non-Commercial + Commercial + spotRepeat);
- Back-to-Back;
- Bumper;
- evidence / Proof of Play;
- heartbeat;
- under maintenance;
- delete device.

**Di luar scope:**
- Dashboard / CMS (`patricia-dashboard-development/`);
- backend Go dan API gateway;
- Gen21 (sales & billing, as-run sync);
- RBAC user;
- DRM.

Platform di HLD: Android TV dan Samsung Tizen. Workspace ini hanya berisi **Samsung Tizen**.

---

## 3. Glosarium

| Istilah | Arti |
|---|---|
| **Campaign Non-Commercial** (Regular / non-Billing) | Konten milik organisasi. **Satu campaign per device.** Asset-nya (A, B, C, …) menjadi *base sequence*. |
| **Campaign Commercial** (Billing) | Iklan berbayar dengan `spotRepeat` dan `productIndustry`. |
| **Gallery / asset** | File video/gambar milik campaign, diurutkan dengan `gallery.order`. |
| **Showtime** | Rentang jam tayang campaign (`{name,start,end}`); satu campaign bisa punya beberapa showtime. |
| **Periode** | Blok 1 jam (`HH:00`–`HH+1:00`). Playlist di-generate per periode. |
| **Cycle** | `[base sequence Non-Commercial] + [Commercial yang masih punya kuota, + separator]`. Notasi `\|` = batas cycle. |
| **Playlist** | Rangkaian cycle dalam satu periode. |
| **spotRepeat / kuota** | Jumlah kemunculan Commercial **per periode 1 jam**. Sisa kuota (`available_spot_repeat`) disimpan lokal. |
| **Back-to-Back (B2B)** | Dua Commercial dengan `productIndustry` sama yang tayang langsung berurutan dalam satu cycle. Kondisi ini dilarang. |
| **Separator** | Satu asset yang disisipkan di antara Commercial B2B: asset Non-Commercial, atau Bumper jika tidak ada Non-Commercial. |
| **Bumper** | Video pengisi milik organisasi. *Organization bumper* = dari device profile/MQTT; *local/default bumper* = asset app. Jenis pemakaian: `idle` (mengisi sisa jam) dan `spacer` (separator darurat). |
| **Evidence / PoP** | Bukti tayang: play log, screenshot, dan upload berkala. |
| **Heartbeat** | Sinyal hidup device via MQTT. |
| **Under maintenance** | Mode jeda dari backend; pemutaran dihentikan sampai di-resume. |

---

## 4. Rule ber-ID

Format: **ID · aturan · sumber**.
- ID playlist dan B2B memakai **nomor dalam kurung siku yang sudah dipakai di nama test** (mis. `'[6] spotRepeat = 2 ...'`), dengan namespace `PL-` dan `B2B-`.
- Rule tanpa nomor memakai ID deskriptif.
- ⚠️ = makna ID direkonstruksi dari nama test dan `campaign_playback.md` §11, karena daftar bernomor aslinya tidak ditemukan di `technical-documentation/` (lihat [OPEN-07](#8-open--konflik)).

### 4.1 Pairing & sesi device — `PAIR-*`
| ID | Aturan | Sumber |
|---|---|---|
| PAIR-01 | Saat start, splash cek status device. Status `paired` → ke player (`/video-player`). Selain itu → halaman auth (`/auth`). | AC 5.2 `view-qr-code-samsung-5.2.md`; kode splash |
| PAIR-02 | Halaman auth menjalankan health check dan internet check, lalu meminta QR (`initiate-qr`) dan menampilkannya untuk di-scan dari dashboard. | AC 5.2 |
| PAIR-03 | App melakukan polling status pairing (awal 15 dtk, lalu tiap 15 dtk) sampai `paired`. Setelah itu polling dihentikan. | kode `DeviceStatusBloc` |
| PAIR-04 | Setelah paired: `claim-token` → simpan access/refresh token → ambil device profile (config, bumper, MQTT topics, `sha`/`signature`). | HLD §5.9.3 langkah 1–2 |
| PAIR-05 | Identitas device dikirim sebagai UUID hasil hash SHA-256 dari device ID, bukan ID mentah. | kode `auth_repository_impl` |
| PAIR-06 | MQTT `delete` / `device_delete` → data lokal dihapus dan app kembali ke halaman auth (pairing ulang). | HLD §5.9.2; AC 5.2 `Device/delete-device-*` |

### 4.2 MQTT — `MQTT-*`
| ID | Aturan | Sumber |
|---|---|---|
| MQTT-01 | Subscribe topic dari device profile: `organizationCampaign`, `provinceCampaign`, `cityCampaign`, `deviceCampaign`, `deviceOrganization`, `deviceConfig`. Topic `heartbeat` hanya untuk publish. | HLD §5.9.2 |
| MQTT-02 | `upsert` → sinkronisasi campaign (debounce 500 ms). Campaign baru/berubah ikut di **cycle berikutnya** (lihat PL-[14]). | HLD; AC Showtime TF 2–3 |
| MQTT-03 | `finish` → campaign **tidak** dihapus langsung. Cycle berjalan diselesaikan dulu, baru campaign dikeluarkan dan file/DB dihapus (lihat PL-[15]). | campaign_playback §2 |
| MQTT-04 | `refresh_settings` → ambil ulang device profile, hapus semua campaign lokal, lalu sync ulang. | kode |
| MQTT-05 | `update` → unduh dan pakai bumper organisasi baru. `delete_bumper` → kembali ke bumper default. | HLD §5.9.2; AC 5.2 bumper-default |
| MQTT-06 | `under_maintenance` dengan `isActive=true` → pause dan hentikan timer periode. Dengan `false` → resume dan ambil active campaign. Lihat MNT-*. | HLD §5.9.2 |
| MQTT-07 | Koneksi MQTT produksi memakai TLS (port 8883) **dengan validasi sertifikat** (SEC-02). ⚠️ Saat ini semua sertifikat diterima, lihat OPEN-08. | HLD §7.2 |

### 4.3 Sinkronisasi campaign — `SYNC-*`
| ID | Aturan | Sumber |
|---|---|---|
| SYNC-01 | Pemicu sync: active-campaign list dari API (saat start/resume) dan MQTT `upsert`. | AC Showtime TF 3 |
| SYNC-02 | Detail diambil hanya jika campaign belum ada lokal atau `version` lokal < remote. | campaign_playback §3 |
| SYNC-03 | Error fetch detail: `CMP40101`/`CMP40000` → berhenti; `CMP40100` → refresh token lalu retry; `CMP50000`/timeout/network → tunggu 5 dtk lalu retry. | AC Showtime TF 3; kode `SyncCampaignCubit` |
| SYNC-04 | Sync **mempertahankan** urutan FIFO (`order`) dan sisa kuota campaign yang di-update. Jika `spotRepeat` berubah di tengah jam, jumlah yang sudah tayang tetap dihitung. | campaign_playback §4 |
| SYNC-05 | Campaign **siap diputar** hanya jika semua gallery-nya sudah ter-download. | campaign_playback §4 |
| SYNC-06 | Sebelum diputar, setiap file divalidasi: ada, ukurannya sama dengan `fileSize`, dan signature SHA256withECDSA atas `galleryId\|sha\|fileSize` valid. Gagal → item dibuang dari cycle dan di-download ulang. | HLD §7.2; campaign_playback §8 |

### 4.4 Showtime & periode — `SHOW-*`
| ID | Aturan | Sumber |
|---|---|---|
| SHOW-01 | Campaign relevan untuk satu periode jika: status `ACTIVE`; tanggal periode di dalam `period.start`–`period.end` (inklusif); `showTime` tidak kosong; ada showtime dengan `start <= jam < end`. | AC Showtime AC-001, TF 5 |
| SHOW-02 | `end` = `00:00`/`24:00` berarti akhir hari. Jika `end < start`, showtime melewati tengah malam. | kode `CampaignShowtimeHelper` |
| SHOW-03 | Playlist di-generate per periode 1 jam. Contoh: showtime 09:00–12:00 → generate pada 09:00, 10:00, 11:00. | AC Showtime TF 7–8 |
| SHOW-04 | Pada pergantian jam, item yang sedang tayang **langsung dipotong** dan playlist jam baru diputar dari item pertama. ⚠️ Lihat OPEN-03. | kode; bertentangan dengan AC Showtime AC-003 |
| SHOW-05 | Safety-net: jika jam sudah berganti saat memilih item berikutnya (timer terlewat atau jam device berubah), playlist langsung di-refresh. | kode |
| SHOW-[7] | Tidak ada campaign relevan → Bumper diputar sepanjang periode. | AC Showtime TF 7 |

### 4.5 Playlist & spotRepeat — `PL-*`
| ID | Aturan | Sumber |
|---|---|---|
| PL-NC1 | Non-Commercial hanya **1 campaign per device**. Asset-nya diurutkan dengan `gallery.order`. | campaign_playback §6 |
| PL-[2] ⚠️ | Non-Commercial selalu di urutan pertama di setiap cycle (base sequence). | AC Playlist AC-001; AC Showtime AC-002 |
| PL-[9] ⚠️ | Hanya Non-Commercial → base sequence di-loop sampai jam selesai. | AC Playlist AC-002 |
| PL-[3] | Commercial ditambahkan setelah base sequence Non-Commercial. | AC Playlist AC-001 |
| PL-FIFO | Urutan Commercial = FIFO (yang masuk lebih dulu tayang lebih dulu) di setiap cycle. | AC Back to Back AC-002 ("priority order"); kode |
| PL-[4] | Kuota spotRepeat dihitung ulang (penuh lagi) di setiap periode 1 jam. | campaign_playback §6 |
| PL-[5] ⚠️ | spotRepeat = 1 → Commercial hanya muncul di cycle pertama periode itu. | test `[4][5]` |
| PL-[6] | spotRepeat = 2 → Commercial muncul di **dua cycle** (1× per cycle). ⚠️ Lihat OPEN-01. | test; bertentangan dengan AC Playlist AC-004 |
| PL-[7] | Kuota dihitung **per Commercial**. | test `[7][8]` |
| PL-[8] | Spot yang sudah tayang di periode yang sama tidak diulang. Restart device di jam yang sama melanjutkan sisa kuota, dan playlist dimulai dari item pertama cycle. | campaign_playback §6 |
| PL-[10] | spotRepeat milik Non-Commercial diabaikan. | test |
| PL-NULLSPOT | spotRepeat Commercial null atau ≤ 0 dianggap **1**. | kode `SpotRepeatHelper` |
| PL-QUOTA | Kuota berkurang 1 saat **end of play** gallery terakhir dari satu kemunculan Commercial. Kuota **tidak** berkurang jika kemunculan terpotong pergantian jam, device mati sebelum selesai, gagal diputar, atau terkena force bumper. | campaign_playback §6, §9 |
| PL-[13] | Hanya Commercial → putar sampai kuota habis, lalu sisa jam diisi Bumper (`idle`). Tidak ada campaign sama sekali → Bumper. ⚠️ Lihat OPEN-02. | AC Playlist AC-003 (pending) |
| PL-[14] | UPSERT di tengah cycle → playlist di-generate ulang di batas cycle, dan campaign baru/berubah ikut di cycle berikutnya. | test |
| PL-[15] | FINISH di tengah cycle → cycle berjalan diselesaikan, lalu campaign dikeluarkan dari cycle berikutnya dan file/DB dihapus. | test |
| PL-NOSLOT | Tidak ada perhitungan slot/fulfillment. Playlist tidak dipaksa memenuhi jumlah slot tertentu. | campaign_playback §6 |
| PL-[1], PL-[11], PL-[12] | Belum dipakai di test dan teks aslinya tidak ditemukan. | OPEN-07 |

Contoh (Non-Commercial A–E; AA spotRepeat 1, BB spotRepeat 2):
```
A B C D E AA BB | A B C D E BB | A B C D E | A B C D E ...
```

### 4.6 Back-to-Back — `B2B-*`
| ID | Aturan | Sumber |
|---|---|---|
| B2B-[3] | Commercial berurutan dengan industri **berbeda** → diputar tanpa separator. | AC B2B AC-001 |
| B2B-[4] | Commercial berurutan dengan `productIndustry` **sama** di dalam satu cycle = back-to-back dan wajib dipisah. | AC B2B AC-002 |
| B2B-[2] ⚠️, B2B-[5] | Separator = **1 asset** Non-Commercial, dipilih sesuai urutan asset (priority). | AC B2B AC-002 |
| B2B-[6] | Rule diterapkan di **setiap cycle**. | AC B2B TF 5 |
| B2B-[7] | Separator **tidak** mengurangi kuota spotRepeat. | test `[6][7]` |
| B2B-[8] ⚠️ | Hanya Commercial yang **langsung berurutan** yang dicek (dipakai bersama `[3]` di test). | test `[3][8]` |
| B2B-[9] | Tidak ada Non-Commercial → **1 Bumper** sebagai *emergency spacer*. | AC B2B AC-003 |
| B2B-ROT | Giliran separator bergilir per asset (A→B→…→A), berlanjut antar cycle, dan di-reset tiap periode 1 jam serta saat app restart. | kode |
| B2B-CYCLE | Rule **tidak** berlaku melintasi batas cycle (`… CC \| AA …` tidak dicek). | test |
| B2B-CMP | Perbandingan industri di-trim dan case-insensitive. Nilai kosong/null **tidak pernah** dianggap sama. | test |
| B2B-[1] | Teks asli tidak ditemukan. | OPEN-07 |

Business case (Non-Commercial = A–E):

| Case | Campaign | Playlist 1 jam |
|---|---|---|
| 1 | AA Shopee (ecommerce, 2), BB Toyota (otomotif, 2), CC Tokopedia (ecommerce, null→1) | `A B C D E AA BB CC \| A B C D E AA BB \| A B C D E` |
| 2 | AA Shopee (ecommerce, 2) | `A B C D E AA \| A B C D E AA \| A B C D E` |
| 3 | AA Shopee (ecommerce, 2), CC Tokopedia (ecommerce, 2) | `A B C D E AA A CC \| A B C D E AA B CC \| A B C D E` |
| 4 | AA, CC (ecommerce, 2), tanpa Non-Commercial | `AA BUMPER CC \| AA BUMPER CC \| BUMPER` |

Cycle terakhir diulang sampai jam selesai.

### 4.7 Bumper — `BUMP-*`
| ID | Aturan | Sumber |
|---|---|---|
| BUMP-01 | Urutan pilihan bumper: (1) bumper organisasi yang sudah ter-download dan file-nya ada; (2) bumper lokal/default dari app (`BUMPER_ASSETS_PATH`). | AC 5.2 `bumper-default.md`; kode |
| BUMP-02 | Jika bumper hasil download gagal di-initialize player, app fallback ke bumper asset bawaan. | kode samsung-tizen |
| BUMP-03 | Cycle tanpa satu pun item yang berhasil diputar → putar satu bumper sebelum mencoba lagi (mencegah busy loop). | campaign_playback §8 |

### 4.8 Evidence & heartbeat — `EVD-*`, `HB-*`
| ID | Aturan | Sumber |
|---|---|---|
| EVD-01 | Saat gallery mulai diputar → catat play log (`tb_evidence_log`). | campaign_playback §9 |
| EVD-02 | Pada `durasi / 2` → ambil screenshot sebagai evidence. | campaign_playback §9 |
| EVD-03 | Evidence dan log di-upload terjadwal setiap 30 menit (`/client-device/campaign/v1/evidence`, `/evidence-log`). | HLD (as-run ~30 menit); `AppConfig.durationEvidenceLogUploading` |
| HB-01 | Device publish heartbeat via MQTT setiap 10 menit. | HLD §5.9.3 |

### 4.9 Under maintenance — `MNT-*`
| ID | Aturan | Sumber |
|---|---|---|
| MNT-01 | Saat maintenance aktif: pemutaran di-pause, timer periode dihentikan, dan frame/banner maintenance ditampilkan. Event *video ended/error* diabaikan. | HLD §5.9.2; kode |
| MNT-02 | Saat maintenance selesai: player di-initialize ulang dan active campaign diambil ulang. | kode |

### 4.10 Keamanan & baseline platform — `SEC-*`
Rule non-fungsional yang wajib dipenuhi setiap release build TV.

| ID | Aturan | Sumber | Status saat ini |
|---|---|---|---|
| SEC-01 | Semua koneksi jaringan (API, download MinIO, MQTT) memakai TLS. | HLD §7.2 | ✅ API/download HTTPS; MQTT 8883 |
| SEC-02 | Sertifikat server **wajib divalidasi**. Dilarang ada `badCertificateCallback` / `onBadCertificate` yang mengembalikan `true`, dan dilarang ada `HttpOverrides` yang permisif. | HLD §7.2 (TLS everywhere) | ❌ MQTT menerima semua sertifikat (OPEN-08) |
| SEC-03 | Release build memakai SDK yang sudah di-patch: Flutter **≥ 3.47.8** / Dart **≥ 3.13.7**, karena GHSA-frr6-h895-5pxp (CA eMudhra bocor, sertifikat TLS bisa dipalsukan pada `dart:io`). | [Advisory Dart SDK](https://github.com/dart-lang/sdk/security/advisories/GHSA-frr6-h895-5pxp) | ❌ build TV memakai flutter-tizen Flutter 3.47.1 (OPEN-09) |
| SEC-04 | Token, header `Authorization`, kredensial MQTT, dan URL pre-signed tidak pernah di-log maupun ditampilkan. | HLD §7.2 | ⚠️ `appPrint*` hanya aktif di debug; inspector Chucker menampilkan request |
| SEC-05 | Integritas konten: file diputar hanya jika lolos verifikasi ukuran dan signature (= SYNC-06). | HLD §7.2 | ✅ |
| SEC-06 | Secret tidak ditambahkan ke `.dev.env`/`.prod.env`, karena keduanya ikut ter-package di `.tpk` sebagai asset. | temuan workspace | ⚠️ kredensial MQTT sudah ada di sana |

Catatan platform untuk SEC-03:
- Advisory menyebut Linux terdampak jika bundle CA sistem belum diperbarui. Tizen berbasis Linux dan CA bundle TV hanya diperbarui lewat firmware, jadi **anggap terdampak**. Ini inferensi; advisory tidak menyebut Tizen.
- Test `flutter-core` di host sudah memakai 3.47.8. Yang menentukan adalah SDK milik flutter-tizen saat `flutter-tizen build tpk`.

---

## 5. Kontrak API (ringkas)

Base URL dari env app (`API_BASE_URL`). Endpoint ada di `flutter-core/lib/cores/constants/api_endpoints.dart`.

| Endpoint | Fungsi |
|---|---|
| `GET /client-device/device/v1/health-check` | Health check (publik) |
| `POST /client-device/device/v1/initiate-qr` | Minta QR pairing |
| `GET /client-device/device/v1/status-checking` | Polling status pairing |
| `GET /client-device/device/v1/claim-token` | Ambil access/refresh token setelah paired |
| `/client-device/device/v1/refresh-token` | Refresh token (otomatis saat 401, oleh `ApiService`) |
| `GET /client-device/device/v1/profile` | Config, bumper, MQTT topics |
| `GET /client-device/campaign/v1/active-campaign/{deviceId}` | Daftar campaign aktif (id + version) |
| `GET /client-device/campaign/v1/details/{id}` | Detail campaign + gallery |
| `POST /client-device/campaign/v1/evidence` (multipart) · `POST …/evidence-log` | Upload evidence / log |

Business code (`status.code` di body):

| Code | Perilaku app |
|---|---|
| `CMP20000` | Sukses |
| `CMP40000`, `CMP40101` | Berhenti (tidak di-retry) |
| `CMP40100` | Refresh token, lalu retry |
| `CMP50000` / timeout / network | Tunggu 5 dtk, lalu retry |

Field detail campaign: `id, label, name, productIndustry, status, type, commercialType (COMMERCIAL|NON_COMMERCIAL), version, spotRepeat, period{start,end}, showTime[{name,start,end}], campaignDuration, gallery[]`.

---

## 6. Kontrak platform

`flutter-core` tidak bergantung ke platform tertentu. App TV wajib:
- memanggil `PatriciaLibFlutter.init(...)` dengan `baseUrl`, `bumperVideoPath`, `pubKeyGalleryHashing`, `mqttConfig`;
- menyediakan implementasi `PlatformDetailDataSource` (info device/layar/jaringan);
- menyediakan dua `VideoPlayerPlatformDataSource` (main dan ads), yang menangani download/hapus gallery, initialize, buildPlayer, play/pause/dispose, serta stream progress/ended/error.

Di Samsung Tizen, implementasinya ada di `samsung-tizen/lib/` di atas plugin `video_player_avplay`.

---

## 7. Traceability rule → kode → test

Tabel lengkap ada di [`flutter-core/lib/docs/campaign_playback.md` §11](flutter-core/lib/docs/campaign_playback.md#11-mapping-rule-spec--kode--test). Test utama:
- `flutter-core/test/features/video_player/helpers/` — `playlist_generator_test.dart`, `back_to_back_helper_test.dart`, `campaign_showtime_helper_test.dart`, `spot_repeat_helper_test.dart`
- `flutter-core/test/features/video_player/presentation/blocs/gallery_play/gallery_play_bloc_test.dart`
- `flutter-core/test/features/commons/presentation/blocs/mqtt_device_action_bloc_test.dart`

---

## 8. OPEN / konflik

Butuh keputusan Product Owner / System Analyst. **Jangan diselesaikan sepihak di kode.**

| ID | Topik | Spec | Implementasi saat ini |
|---|---|---|---|
| OPEN-01 | Cara spotRepeat diputar | AC Playlist AC-004: Commercial diputar **x kali berturut-turut**, lalu pindah ke Commercial berikutnya | 1× per cycle sampai kuota habis (PL-[6]); cocok dengan contoh Case 1–3 |
| OPEN-02 | Playlist commercial-only | AC Playlist AC-003: *pending confirmation* (loop Commercial vs Bumper setelah sekali tayang) | Putar sisa kuota, lalu Bumper (PL-[13]) |
| OPEN-03 | Waktu pergantian showtime | AC Showtime AC-003: pindah playlist **setelah loop/asset berjalan selesai** | Item dipotong tepat di pergantian jam (SHOW-04) |
| OPEN-04 | Prioritas Commercial vs Non-Commercial dalam showtime | HLD §8 no. 8: masih open (Product Owner / Apps) | Non-Commercial dulu, lalu Commercial (PL-[2], PL-[3]); sesuai AC Showtime AC-002 |
| OPEN-05 | Evidence untuk item identik berturut-turut | — | Evidence putaran kedua tidak terpicu (state Equatable sama), kuota tetap terhitung |
| OPEN-06 | DRM | HLD: konten MP4 lokal, tanpa DRM | Privilege `drmplay` tetap dideklarasikan di `tizen-manifest.xml` |
| OPEN-07 | Asal nomor rule `[n]` | Daftar bernomor asli (PL/B2B `[1]`–`[15]`) tidak ditemukan di `technical-documentation/` | Makna ID ⚠️ di §4 direkonstruksi dari nama test; perlu dikonfirmasi pemilik spec |
| OPEN-08 | **[HIGH] Validasi sertifikat MQTT** | SEC-02, MQTT-07: TLS dengan sertifikat tervalidasi | `mqtt_service.dart` → `onBadCertificate` selalu `return true` (port 8883 dan wss). Broker bisa dipalsukan (MITM): attacker bisa mengirim `delete`/`under_maintenance`/`upsert` palsu dan membaca heartbeat. Perlu keputusan: CA mana yang dipakai broker on-prem (publik vs internal), lalu validasi normal atau pinning CA internal. Upgrade SDK **tidak** menutup celah ini. |
| OPEN-09 | **[HIGH] Build TV belum bisa memakai Flutter 3.47.8** | SEC-03 | Rilis flutter-tizen terbaru adalah `3.47.5-tizen.1.0.1` (Flutter 3.47.5), dan versi lokal ter-pin ke 3.47.1. Keduanya masih terdampak GHSA-frr6-h895-5pxp. Pilihan: tunggu rilis flutter-tizen berbasis ≥ 3.47.8, atau mitigasi sementara dengan trust store/pinning khusus untuk endpoint Patricia (butuh perubahan kode dan keputusan infra, lihat HLD §8 no. 2). Bukti dan link: [di bawah tabel](#bukti--referensi-open-09-dicek-26-okt-2026). |
| OPEN-10 | `flutter-core` masih ter-resolve dengan Flutter 3.38.10 | SEC-03 | `.dart_tool/version` = 3.38.10, `pubspec.lock` minimal Flutter 3.38.4. Perlu `pub get` ulang dengan 3.47.8, regen build_runner, lalu test penuh. Constraint `sdk: ^3.8.1` tetap kompatibel; menaikkannya adalah keputusan terpisah. |

#### Bukti & referensi OPEN-09 (dicek 26 Okt 2026)

**1. Kenapa harus ≥ 3.47.8 (celah keamanan)**
- [GHSA-frr6-h895-5pxp — Dart SDK security advisory](https://github.com/dart-lang/sdk/security/advisories/GHSA-frr6-h895-5pxp):
  - Severity **High** (CWE-295). Delapan intermediate CA eMudhra bocor, sehingga sertifikat TLS untuk domain apa pun bisa dipalsukan pada koneksi `dart:io`.
  - Yang terdampak: Flutter stable < **3.47.8** dan Dart < **3.13.7**.
  - Platform: Android dan Windows terdampak; Linux terdampak jika CA bundle sistem belum diperbarui.
  - Satu-satunya remediasi adalah upgrade SDK lalu rebuild. Advisory tidak memberikan workaround.
- [Flutter — Security](https://docs.flutter.dev/security): banner *"Flutter 3.47.8 now blocks compromised eMudhra CA keys"*.
- [flutter/flutter#195000 — [stable] [hotfix] Flutter Release Version 3.47.8](https://github.com/flutter/flutter/issues/195000): issue tracking hotfix 3.47.8.
- [Flutter 3.47.0 release notes](https://docs.flutter.dev/release/release-notes/release-notes-3.47.0) · [Breaking changes 3.47](https://docs.flutter.dev/release/breaking-changes#released-in-flutter-3-47) · [Flutter CHANGELOG (stable)](https://github.com/flutter/flutter/blob/stable/CHANGELOG.md): changelog stable baru sampai 3.47.7; 3.47.8 belum tercatat dan hanya diumumkan lewat advisory.

**2. Kenapa build TV belum bisa memakai 3.47.8 (flutter-tizen)**
- [flutter-tizen releases](https://github.com/flutter-tizen/flutter-tizen/releases): rilis terbaru adalah **`3.47.5-tizen.1.0.1`** (20 Okt), lalu `3.47.5-tizen.1.0.0` (12 Okt) dan `3.47.1-tizen.1.1.2` (12 Okt). Belum ada rilis berbasis 3.47.8.
- [Release 3.47.5-tizen.1.0.1](https://github.com/flutter-tizen/flutter-tizen/releases/tag/3.47.5-tizen.1.0.1): isinya perbaikan tooling serta update engine/embedder. Tidak ada fix keamanan TLS.
- [flutter-tizen PR #832 — Upgrade to Flutter 3.47.5](https://github.com/flutter-tizen/flutter-tizen/pull/832): upgrade Flutter di flutter-tizen butuh engine fork ([flutter-tizen/flutter](https://github.com/flutter-tizen/flutter)) dan embedder ([flutter-tizen/embedder](https://github.com/flutter-tizen/embedder)). Karena itu kita tidak bisa sekadar mengarahkannya ke Flutter 3.47.8.
- [flutter-tizen issue #826 (Migrate to Flutter 3.47.5)](https://github.com/flutter-tizen/flutter-tizen/issues/826) dan [#807 (Migrate to Flutter 3.47)](https://github.com/flutter-tizen/flutter-tizen/issues/807): keduanya sudah closed. Belum ada issue untuk 3.47.6–3.47.8.
- [`bin/internal/flutter.version`](https://github.com/flutter-tizen/flutter-tizen/blob/main/bin/internal/flutter.version): pin commit Flutter yang dipakai flutter-tizen. Inilah SDK yang menentukan hasil `flutter-tizen build tpk`, bukan `~/flutter`.
- [flutter-tizen `doc/commands.md`](https://github.com/flutter-tizen/flutter-tizen/blob/main/doc/commands.md):
  - `flutter-tizen upgrade` = upgrade ke rilis terbaru; `--verify-only` hanya mengecek.
  - `flutter-tizen channel <tag>` = pindah ke tag rilis tertentu.

**3. Bukti lokal (mesin dev)**
```text
$ flutter-tizen --version
Flutter-Tizen • revision 3862cc300b
Flutter 3.47.1 • Framework revision 6655482ec0 (2026-08-19) • Dart 3.13.1   ← < 3.47.8 / 3.13.7 (terdampak)

$ flutter --version            # ~/flutter, hanya untuk test flutter-core
Flutter 3.47.8 • Framework revision 737ba8f885 (2026-10-22) • Dart 3.13.7   ← sudah patch
```

**Kriteria penutupan OPEN-09:**
1. flutter-tizen merilis tag `3.47.8-tizen.*` atau yang lebih baru.
2. `flutter-tizen upgrade` dijalankan.
3. `flutter-tizen --version` menunjukkan Flutter ≥ 3.47.8 / Dart ≥ 3.13.7.
4. `.tpk` di-rebuild dan di-redeploy ke semua TV.

---

## 9. Proses menambah / mengubah rule

1. Pastikan rule ada di AC (`technical-documentation/…/acceptance_criteria/Apps/`) atau sudah diputuskan PO. Jika belum, tambahkan ke §8 sebagai OPEN.
2. Beri / perbarui ID di §4 dokumen ini.
3. Ubah kode di tempat yang ditunjuk `campaign_playback.md` §10.
4. Tambah/ubah test yang namanya memuat ID rule (mis. `'[6] spotRepeat = 2 ...'`).
5. Perbarui tabel §11 di `campaign_playback.md` dan [§7](#7-traceability-rule--kode--test) jika ada file test baru.
