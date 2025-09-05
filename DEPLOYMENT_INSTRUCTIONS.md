# Panduan Deployment ke Supabase dan Vercel

## 📋 Langkah-langkah Deployment

### 1. Setup Database di Supabase

#### A. Buat Project Baru di Supabase
1. Kunjungi [supabase.com](https://supabase.com)
2. Login atau daftar akun baru
3. Klik "New Project"
4. Pilih organization dan beri nama project
5. Buat password database yang kuat
6. Pilih region terdekat
7. Klik "Create new project"

#### B. Jalankan Database Schema
1. Setelah project selesai dibuat, buka **SQL Editor**
2. Copy seluruh isi file `database/schema.sql`
3. Paste ke SQL Editor dan klik **Run**
4. Pastikan semua tabel berhasil dibuat tanpa error

#### C. Dapatkan Database URL
1. Buka **Settings** > **Database**
2. Copy **Connection string** dengan format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
3. Ganti `[YOUR-PASSWORD]` dengan password database yang Anda buat

### 2. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Simpan output public key dan private key untuk konfigurasi environment.

### 3. Deploy Backend ke Vercel

#### A. Buat Project Backend di Vercel
1. Login ke [vercel.com](https://vercel.com)
2. Klik "New Project"
3. Import repository GitHub Anda
4. Pilih **Root Directory**: `backend`
5. **Framework Preset**: Other
6. **Build Command**: `npm run build`
7. **Output Directory**: `dist`
8. **Install Command**: `npm install`

#### B. Konfigurasi Environment Variables Backend
Tambahkan environment variables berikut di Vercel:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=[GENERATE-STRONG-32-CHAR-SECRET]
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=[GENERATE-STRONG-32-CHAR-REFRESH-SECRET]
JWT_REFRESH_EXPIRES_IN=7d
VAPID_PUBLIC_KEY=[YOUR-VAPID-PUBLIC-KEY]
VAPID_PRIVATE_KEY=[YOUR-VAPID-PRIVATE-KEY]
VAPID_SUBJECT=mailto:admin@yourdomain.com
CORS_ORIGIN=https://your-frontend.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
BCRYPT_ROUNDS=12
```

#### C. Deploy Backend
1. Klik **Deploy**
2. Tunggu hingga deployment selesai
3. Catat URL backend (misal: `https://your-backend.vercel.app`)

### 4. Deploy Frontend ke Vercel

#### A. Buat Project Frontend di Vercel
1. Klik "New Project" lagi
2. Import repository GitHub yang sama
3. Pilih **Root Directory**: `/` (root)
4. **Framework Preset**: Next.js
5. Biarkan build settings default

#### B. Konfigurasi Environment Variables Frontend
Tambahkan environment variables berikut:

```env
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

#### C. Deploy Frontend
1. Klik **Deploy**
2. Tunggu hingga deployment selesai
3. Catat URL frontend (misal: `https://your-frontend.vercel.app`)

### 5. Update CORS Configuration

1. Kembali ke project backend di Vercel
2. Update environment variable `CORS_ORIGIN` dengan URL frontend yang sebenarnya:
   ```env
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
3. Redeploy backend

### 6. Testing Deployment

#### A. Test Backend API
```bash
curl https://your-backend.vercel.app/api/health
```

#### B. Test Admin Login
1. Buka `https://your-frontend.vercel.app/admin/login`
2. Login dengan:
   - Email: `admin@pushnotify.com`
   - Password: `admin123`

#### C. Test Dashboard
1. Setelah login, akses dashboard admin
2. Pastikan statistik muncul dengan benar
3. Test pembuatan client baru

### 7. Security Checklist

- [ ] Ganti password default admin di database
- [ ] Generate JWT secrets yang kuat (minimal 32 karakter)
- [ ] Pastikan CORS hanya mengizinkan domain yang benar
- [ ] Aktifkan SSL/HTTPS di semua endpoint
- [ ] Review dan update rate limiting sesuai kebutuhan

### 8. Monitoring dan Maintenance

1. **Supabase Dashboard**: Monitor database performance dan usage
2. **Vercel Analytics**: Monitor aplikasi performance
3. **Logs**: Check Vercel function logs untuk error
4. **Backup**: Setup automated database backup di Supabase

## 🔧 Troubleshooting

### Database Connection Issues
- Pastikan DATABASE_URL format benar
- Check Supabase project status
- Verify password dan connection string

### CORS Errors
- Update CORS_ORIGIN dengan domain yang benar
- Pastikan tidak ada trailing slash
- Redeploy backend setelah update

### Authentication Issues
- Verify JWT_SECRET konsisten
- Check token expiration settings
- Ensure admin user exists di database

### Build Errors
- Check Node.js version compatibility
- Verify all dependencies installed
- Review build logs di Vercel

## 📞 Support

Jika mengalami masalah deployment, check:
1. Vercel deployment logs
2. Supabase database logs
3. Browser developer console
4. Network tab untuk API calls

---

**Selamat! Aplikasi PWA Push Notification SaaS Anda sekarang sudah live di production! 🎉**