# Albert & Stephanie — Wedding

Undangan pernikahan digital + admin reservasi dan scan QR, dengan pengiriman undangan lewat n8n + WAHA (WhatsApp).

| App | Fungsi | Port dev |
|---|---|---|
| `apps/web` | Undangan (cover → halaman undangan, RSVP, Kind Words) | 5173 |
| `apps/booth` | Admin tamu: login password → scan QR / daftar tamu dan filter. Buka `/` atau `/admin` | 5175 |
| `apps/back` | API reservasi, ucapan, undangan personal dan check-in QR; database SQLite | 4000 |

Daftar tamu ada di **n8n Data Table**, dan n8n yang mengirim undangan via WAHA. Detail arsitektur: [CLAUDE.md](./CLAUDE.md).

## Jalanin lokal

```bash
npm install
cp .env.example apps/back/.env      # isi WEDDING_ADMIN_USERNAME dan WEDDING_ADMIN_PASSWORD
npm run dev -w web
npm run dev -w booth
npm run dev -w back
```

Admin di `http://localhost:5175/` meneruskan `/api` ke backend (port 4000) otomatis. Login memakai username `WEDDING_ADMIN_USERNAME` dan password `WEDDING_ADMIN_PASSWORD` yang ditentukan di backend. Lebih dari 10 petugas dapat login bersamaan; 20 sesi dan pemindaian bersamaan diuji melalui API. Kamera hanya jalan di `localhost` atau `https`.
n8n + WAHA lokal (opsional): `docker compose up -d`.

## Deploy ke VPS

Alurnya: perubahan web → workflow **Invitation + API**, perubahan admin → **Admin + API**, perubahan proxy → **VPS proxy**. Masing-masing menjalankan pemeriksaan, build image, push ke GHCR dan update layanannya sendiri. Backend dipakai bersama dan ikut jalur web maupun admin. GitHub Pages tetap jalur utama preview undangan. Panduan bootstrap VPS, secret dan rollback: [docs/ci-cd.md](docs/ci-cd.md).
Pull request hanya menjalankan lint + build (image dibuild tapi tidak di-push).

Stack di VPS (`docker-compose.prod.yml`): **edge** (Caddy, HTTPS otomatis: undangan + admin di domain bekas booth + proxy API + n8n), **web**, **admin**, **back**, **n8n**, **waha**.

### Setup sekali di awal

1. **DNS**: buat 3 A record (misal `undangan.`, `booth.`, `n8n.`) ke IP VPS.
2. **VPS** (Ubuntu): install Docker Engine + plugin compose, buka port 80, 443 (TCP dan UDP). Buat user `deploy` dan masukkan ke grup `docker`.
3. **Folder + `.env`** di VPS:
   ```bash
   sudo mkdir -p /opt/birdies-gift && sudo chown deploy: /opt/birdies-gift
   # salin .env.prod.example jadi /opt/birdies-gift/.env lalu isi semua nilainya
   ```
4. **Kunci SSH khusus deploy** (di komputermu):
   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N ""
   ```
   Isi `deploy_key.pub` ke `~deploy/.ssh/authorized_keys` di VPS, lalu hapus file kunci dari komputermu setelah dimasukkan ke GitHub.
5. **GitHub → Settings → Secrets and variables → Actions**:
   - Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (isi `deploy_key`), `VPS_KNOWN_HOSTS` (output `ssh-keyscan -t ed25519 <IP VPS>`), opsional `VPS_PORT`.
   - Variable: `DEPLOY_ENABLED` = `true` setelah bootstrap VPS selesai (selama belum di-set, job deploy dilewati).
6. Setelah deploy pertama: **langsung buka URL n8n dan buat akun owner** (siapa yang buka duluan yang jadi owner).

### Catatan operasional

- **Scan QR WhatsApp**: dashboard WAHA tidak dibuka ke internet. Dari komputermu: `ssh -L 3000:localhost:3000 deploy@<IP>` lalu buka `http://localhost:3000`.
- **Rollback**: jalankan `bash update-service.sh web <sha>` atau `admin <sha>` di VPS; lihat panduan CI/CD. Image setiap commit memakai tag SHA.
- **Backup** (volume Docker): `booth_data` (database reservasi dan check-in), `n8n_data` (workflow, kredensial, **Data Table tamu**), `waha_data` (sesi WhatsApp), `caddy_data` (sertifikat). Untuk SQLite gunakan mekanisme backup SQLite atau hentikan backend sebelum menyalin file. Contoh backup n8n:
  ```bash
  docker run --rm -v birdies-gift_n8n_data:/d -v "$PWD":/b alpine tar czf /b/n8n_data.tgz -C /d .
  ```
- **Foto asli tidak ikut image**: hanya `*-web.jpg` di `apps/web/public` yang dipakai. Beri nama file asli `X.jpg` dan versi webnya `X-web.jpg`.
# Wedding reservations and check-in

The invitation includes a database-backed RSVP and wishes service plus an organizer console at `/admin`. Setup, credentials, QR behavior, backups, and deployment requirements are documented in [docs/guest-checkin.md](docs/guest-checkin.md).

