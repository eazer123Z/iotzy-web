# IoTzy Standalone Deployment Guide (GitHub & Vercel)

Panduan ini berisi langkah-langkah untuk mendeploy hanya folder **LOTZY** (Website + Logika) tanpa perlu keseluruhan sistem Docker.

## 1. Persiapan GitHub
1.  Buat repositori baru di GitHub (misal: `iotzy-web`).
2.  Inisialisasi git di folder `LOTZY` Anda:
    ```bash
    git init
    git add .
    git commit -m "Initial standalone commit"
    git remote add origin https://github.com/username/iotzy-web.git
    git push -u origin main
    ```

## 2. Persiapan Database (Eksternal)
Karena Vercel tidak menyediakan database, Anda harus menggunakan layanan cloud database (pilih salah satu):
- **Railway.app** (Direkomendasikan - MySQL gratis/murah)
- **Aiven.io** (MySQL gratis)
- **Supabase** (Jika ingin migrasi ke PostgreSQL)

**Langkah:**
1.  Buat database MySQL baru di layanan pilihan Anda.
2.  Impor file `database/schema.sql` yang ada di folder ini ke database tersebut.
3.  Catat kredensialnya (Host, Database, User, Password).

## 3. Deployment ke Vercel
1.  Login ke [Vercel](https://vercel.com).
2.  Klik **"Add New"** -> **"Project"**.
3.  Impor repositori GitHub `iotzy-web` Anda.
4.  **SANGAT PENTING: Pengaturan Environment Variables**
    Di dashboard Vercel, masuk ke *Settings -> Environment Variables* dan tambahkan data berikut:
    - `MYSQL_HOST`: (Host dari cloud database Anda)
    - `MYSQL_DB`: (Nama database)
    - `MYSQL_USER`: (User database)
    - `MYSQL_PASS`: (Password database)
    - `APP_SECRET`: (Ganti dengan string random panjang)
5.  Klik **Deploy**.

## 4. Konfigurasi Khusus Vercel
- File `vercel.json` sudah saya sediakan untuk mengatur routing PHP secara otomatis.
- Gunakan runtime `vercel-php@0.7.0` (Anda tidak perlu menginstall apa pun, Vercel yang akan menanganinya).

Sekarang website IoTzy Anda sudah live secara publik! 🚀
