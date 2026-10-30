# Setup Codex — Event Studio

Setup ini melengkapi konfigurasi `.claude/` untuk Codex lokal di proyek ini.

| Lokasi | Fungsi |
| --- | --- |
| `AGENTS.md` | Konteks proyek, batas arsitektur, aturan kerja dan verifikasi |
| `.codex/config.toml` | Mengaktifkan agen dan membatasi subagen terbuka menjadi 3 |
| `.codex/agents/*.toml` | 7 peran: scout, architect, coder, qa, reviewer, documenter, devops |
| `.codex/workflows.md` | 11 alur kerja, pembagian file, verifikasi dan review/fix |
| `.agents/skills/event-*/SKILL.md` | 12 skills Codex: mode agentic dan 11 workflow |
| `.agents/skills/<domain>` | 14 symlink relatif ke skills yang sama di `.claude/skills/` |

Model dan tingkat reasoning mengikuti sesi induk; tidak ada model berbayar tertentu yang dipaksakan. Pengaturan izin dan sandbox juga mengikuti sesi/policy pengguna. Peran read-only adalah instruksi perilaku, bukan sandbox terpisah.

## Cara pakai

Buka proyek sebagai workspace yang dipercaya di Codex, lalu mulai sesi baru agar instruksi dan konfigurasi proyek terbaca. Skills lokal dideteksi otomatis; bila belum muncul, restart Codex. Konfigurasi project hanya dimuat untuk proyek yang dipercaya. Setup ini tidak mengubah trust atau konfigurasi global pengguna.

Contoh prompt di chat Codex:

```text
$event-agentic lanjutkan task berikutnya yang siap di docs/progress.md
$event-feature tambahkan kontrol viewer sesuai FR-04
$event-bugfix perbaiki perpindahan living-room yang macet
$event-review review perubahan working tree, tanpa edit
$event-security audit batas tenant dan invite token
$event-performance periksa biaya render living-room
$event-analyze jelaskan alur GLB loader ke scene state
$world-engine periksa mapping hotspot joglo
```

Workflow lain: `$event-refactor`, `$event-document`, `$event-comment`, `$event-devops`, `$event-solutioning`. Nama Claude `/feature`, `/bugfix`, dan seterusnya dipetakan ke skills `$event-*`; file `.claude/commands` tidak didaftarkan sebagai slash command Codex.

Mode agentic memilih spesialis untuk tugas besar, mengurutkan langkah yang saling bergantung, dan memparalelkan pekerjaan independen bila runtime mengizinkan. Untuk perubahan kecil, agen utama bekerja langsung. Jika subagen tidak tersedia, langkah dikerjakan berurutan dengan keterbatasan tersebut dilaporkan. Mengaktifkan konfigurasi di repo tidak mengubah kemampuan sesi yang sudah berjalan.

Untuk menjalankan satu tugas tanpa delegasi, tulis "kerjakan langsung tanpa subagen". Untuk mematikan delegasi secara lokal, ubah `agents.enabled` menjadi `false` di `.codex/config.toml`.

## Pemeliharaan

- Edit domain skills di `.claude/skills/`; tautannya membuat Codex membaca sumber yang sama beserta `references/`.
- Saat menambah domain skill baru, tambahkan symlink relatif di `.agents/skills/`. Jangan membuat salinan kedua dengan nama skill yang sama.
- Pertahankan symlink saat checkout. Pada lingkungan yang tidak mendukungnya, salin seluruh folder skill beserta referensinya dan sinkronkan secara manual.
- Peran dan workflow Codex adalah adaptasi dari `.claude/`, bukan hasil sinkronisasi otomatis. Perbarui keduanya bila aturan tim berubah.
- Beberapa target symlink masih merupakan WIP yang belum dilacak Git. Bila nanti menyimpan setup dalam commit, sertakan folder target tersebut agar checkout lain tidak memiliki tautan rusak.
- `assets:validate`, `db:migrate`, dan `db:seed` saat ini masih placeholder yang memblokir; panduan Codex tidak menganggapnya sudah berfungsi.

## Referensi format

Format diperiksa dengan dokumentasi resmi OpenAI dan Codex CLI lokal `0.164.0-alpha.11.1`:

- [Custom agents dan pewarisan pengaturan](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Skills lokal dan symlink](https://learn.chatgpt.com/docs/build-skills)
- [Konfigurasi project dan trust](https://learn.chatgpt.com/docs/config-file/config-reference)
