# 🚀 Deployment Guide - PW88 Push Notification System

Panduan lengkap untuk deploy aplikasi ke production menggunakan Vercel + Supabase + GitHub.

## 📋 Prerequisites

- ✅ Akun GitHub
- ✅ Akun Vercel
- ✅ Akun Supabase

## 🗄️ Step 1: Setup Database di Supabase

### 1.1 Buat Project Baru
1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Pilih organization dan isi:
   - **Name**: `pw88-push-system`
   - **Database Password**: Buat password yang kuat
   - **Region**: Pilih yang terdekat (Singapore/Tokyo)
4. Klik **"Create new project"**

### 1.2 Setup Database Schema
1. Tunggu project selesai dibuat (2-3 menit)
2. Buka **SQL Editor** di sidebar
3. Copy paste isi file `database/schema.sql` ke SQL Editor
4. Klik **"Run"** untuk execute schema

### 1.3 Dapatkan Connection String
1. Buka **Settings** → **Database**
2. Scroll ke **Connection string**
3. Pilih **"URI"** dan copy connection string
4. Format: `postgresql://postgres:[password]@[host]:5432/postgres`

## 📁 Step 2: Setup GitHub Repository

### 2.1 Buat Repository Baru
1. Login ke GitHub
2. Klik **"New repository"**
3. Isi:
   - **Repository name**: `pw88-push-system`
   - **Description**: `PWA Push Notification Management System`
   - **Visibility**: Private (recommended)
4. Klik **"Create repository"**

### 2.2 Push Code ke GitHub
```bash
# Di terminal, jalankan di folder project:
git init
git add .
git commit -m "Initial commit: PW88 Push Notification System"
git branch -M main
git remote add origin https://github.com/[username]/pw88-push-system.git
git push -u origin main
```

## 🌐 Step 3: Deploy ke Vercel

### 3.1 Import Project
1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik **"New Project"**
3. Import dari GitHub:
   - Pilih repository `pw88-push-system`
   - Klik **"Import"**

### 3.2 Configure Project
1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `./` (default)
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `.next` (default)
5. Klik **"Deploy"** (akan gagal dulu, normal)

### 3.3 Setup Environment Variables
1. Buka project di Vercel Dashboard
2. Klik **"Settings"** → **"Environment Variables"**
3. Tambahkan variables berikut:

```env
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key-here-min-32-chars
JWT_EXPIRES_IN=7d

# VAPID (Generate di https://vapidkeys.com/)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@domain.com

# API
API_BASE_URL=https://your-app.vercel.app
CORS_ORIGIN=https://your-app.vercel.app

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-key-min-32-chars

# Optional - Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### 3.4 Redeploy
1. Klik **"Deployments"** tab
2. Klik **"Redeploy"** pada deployment terakhir
3. Tunggu deployment selesai (2-3 menit)

## 🔧 Step 4: Generate VAPID Keys

1. Buka [https://vapidkeys.com/](https://vapidkeys.com/)
2. Klik **"Generate VAPID Keys"**
3. Copy **Public Key** dan **Private Key**
4. Update environment variables di Vercel:
   - `VAPID_PUBLIC_KEY`: Public Key
   - `VAPID_PRIVATE_KEY`: Private Key
   - `VAPID_EMAIL`: Email Anda

## 🧪 Step 5: Testing Production

### 5.1 Akses Aplikasi
1. Buka URL Vercel Anda: `https://your-app.vercel.app`
2. Login sebagai admin:
   - **Email**: `admin@pushnotify.com`
   - **Password**: `admin123`

### 5.2 Test Fitur Utama
- ✅ Login admin berhasil
- ✅ Dashboard menampilkan data
- ✅ Tambah client baru
- ✅ Kirim push notification
- ✅ Analytics berfungsi

## 🔄 Step 6: Auto-Deployment Setup

Setelah setup awal, setiap push ke GitHub akan otomatis deploy ke Vercel:

```bash
# Untuk update aplikasi:
git add .
git commit -m "Update: description of changes"
git push origin main
# Vercel akan auto-deploy dalam 1-2 menit
```

## 🛠️ Troubleshooting

### Database Connection Error
- Pastikan DATABASE_URL benar
- Cek password tidak ada karakter khusus yang perlu di-encode
- Pastikan Supabase project sudah aktif

### Build Error
- Cek environment variables sudah lengkap
- Pastikan semua dependencies ada di package.json
- Lihat build logs di Vercel untuk detail error

### VAPID Error
- Generate ulang VAPID keys
- Pastikan format email benar: `mailto:email@domain.com`
- Cek tidak ada spasi di awal/akhir keys

## 📞 Support

Jika ada masalah:
1. Cek Vercel deployment logs
2. Cek Supabase logs di Dashboard
3. Test koneksi database di Supabase SQL Editor

---

**🎉 Selamat! Aplikasi PW88 sudah live di production!**