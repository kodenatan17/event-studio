# Setup OpenCode — Event Studio

Setup ini melengkapi konfigurasi `.claude/` untuk OpenCode V2 di proyek ini.

| Lokasi | Fungsi |
| --- | --- |
| `AGENTS.md` | Konteks proyek, batas arsitektur, aturan kerja dan verifikasi |
| `opencode.jsonc` | Schema dan guardrail perintah Git/destruktif |
| `.opencode/agents/*.md` | 7 peran: scout, architect, coder, qa, reviewer, documenter, devops |
| `.opencode/commands/*.md` | 11 slash command: `/feature`, `/bugfix`, `/refactor`, `/review`, `/security`, `/performance`, `/analyze`, `/document`, `/comment`, `/devops`, `/solutioning` |
| `.claude/skills/*/SKILL.md` | 14 domain/Three.js skills (sumber utama) |
| `.agents/skills/event-*/SKILL.md` | 12 skills workflow/agentic |

Skills **tidak diduplikasi** di `.opencode/skills`. OpenCode V2 otomatis membaca
`.claude/skills` dan `.agents/skills` sebagai project compatibility sources, jadi
kedua set skill langsung tersedia tanpa salinan kedua.

Model tidak dipaksakan. Subagent mewarisi model sesi induk; pilih model lewat
sesi OpenCode seperti biasa. Peran tanpa edit kode (`scout`, `architect`,
`reviewer`) ditegakkan dengan permission OpenCode, bukan hanya instruksi: edit
ditolak, shell dibatasi ke `git status/diff/log/show` bila relevan, dan subagent
tidak boleh merekrut subagent lain. `documenter` diarahkan hanya ke file
dokumentasi; `coder`, `qa`, dan `devops` boleh mengedit sesuai lingkupnya.

## Cara pakai

Buka proyek ini di OpenCode, lalu mulai sesi baru agar konfigurasi proyek
terbaca. Skills lokal muncul otomatis; bila belum, jalankan `opencode reload`
atau restart sesi.

Contoh prompt/command:

```text
/feature tambahkan kontrol viewer sesuai FR-04
/bugfix perbaiki perpindahan living-room yang macet
/review review perubahan working tree, tanpa edit
/security audit batas tenant dan invite token
/performance periksa biaya render living-room
/analyze jelaskan alur GLB loader ke scene state
/document perbarui docs/progress.md untuk task yang selesai
/solutioning cek konsistensi specs.md dan api-contracts.md
```

Untuk memuat skill tertentu secara eksplisit, sebut `@skill-id`, misalnya
`@world-engine` atau `@wedding-security-boundaries`. Untuk tugas kecil, agen
utama boleh bekerja langsung; route agentic dipakai saat pekerjaan cukup besar
atau saat user memintanya.

## Alur agentic

Setiap command memakai `subagent` tool dengan agent ID yang sama seperti nama
file di `.opencode/agents/`. Kontrak eksekusinya:

1. Tentukan hasil yang diminta, apakah edit diizinkan, dan konteks spec/decision.
2. Delegasikan langkah spesialis yang benar-benar berguna; setiap prompt membawa
   request, mode, temuan sebelumnya, path yang dimiliki, dan skill yang perlu dibaca.
3. Jalankan langkah dependen secara berurutan; paralelkan hanya pekerjaan
   independen dengan kepemilikan file yang terpisah.
4. Review loop maksimal 2 putaran: reviewer FAIL → coder(fix) → reviewer.
5. Laporkan perubahan/finding, command yang benar-benar dijalankan, dan
   keterbatasan. Jangan mengklaim langkah yang tidak dijalankan.

Jika subagent tidak tersedia, kerjakan langkah yang relevan secara berurutan dan
sebutkan keterbatasan itu. Permintaan analisis, review, atau audit tidak otomatis
menjadi izin untuk mengubah kode.

## Pemeliharaan

- Edit domain skills di `.claude/skills/`; tautan `.agents/skills/<domain>`
  membuat Codex dan OpenCode membaca sumber yang sama beserta `references/`.
- Edit workflow skills di `.agents/skills/event-*/`.
- Peran dan command OpenCode adalah adaptasi dari `.claude/`, bukan sinkronisasi
  otomatis. Perbarui `.claude/`, `.codex/`, dan `.opencode/` bila aturan tim berubah.
- Jangan menaruh skill baru di `.opencode/skills/` dengan ID yang sama seperti
  `.claude/skills/` atau `.agents/skills/`; sumber `.opencode` menang dan akan
  menutupi versi asli.
- `assets:validate`, `db:migrate`, dan `db:seed` masih placeholder yang memblokir;
  jangan menganggapnya sebagai validasi yang berhasil.

## Verifikasi setup

```sh
opencode debug config     # sumber konfigurasi yang terbaca
opencode debug agents     # daftar agent + permission
opencode api get "/api/command?location%5Bdirectory%5D=$PWD"
opencode api get "/api/skill?location%5Bdirectory%5D=$PWD"
```

Jika daftar agent belum memuat tujuh peran proyek, pastikan file berada di
`.opencode/agents/` dan frontmatter YAML valid.
