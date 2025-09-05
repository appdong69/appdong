# 🚀 Panduan Deployment Lengkap ke Supabase dan Vercel

## 📋 Checklist Deployment

### ✅ Persiapan (Sudah Selesai)
- [x] Generate VAPID Keys
- [x] Setup file konfigurasi
- [x] Push ke GitHub repository

### 🎯 Langkah Deployment (Ikuti Urutan Ini)

---

## 1. 🗄️ Setup Database di Supabase

### A. Buat Project Supabase
1. **Buka** [supabase.com](https://supabase.com)
2. **Login** atau daftar akun baru
3. **Klik** "New Project"
4. **Isi** detail project:
   - Organization: Pilih atau buat baru
   - Name: `pwa-push-notification`
   - Database Password: **Buat password yang kuat** (simpan ini!)
   - Region: Pilih yang terdekat (Singapore/Tokyo)
5. **Klik** "Create new project"
6. **Tunggu** hingga project selesai dibuat (~2 menit)

### B. Jalankan Database Schema
1. **Buka** project Supabase yang baru dibuat
2. **Klik** "SQL Editor" di sidebar kiri
3. **Klik** "New query"
4. **Copy** seluruh isi file `database/schema.sql` dari project ini
5. **Paste** ke SQL Editor
6. **Klik** "Run" (tombol play)
7. **Pastikan** semua query berhasil (tidak ada error merah)

### C. Dapatkan Database Connection String
1. **Klik** "Settings" di sidebar
2. **Klik** "Database"
3. **Scroll** ke "Connection string"
4. **Copy** URI connection string
5. **Ganti** `[YOUR-PASSWORD]` dengan password database Anda
6. **Simpan** connection string ini untuk langkah selanjutnya

**✅ Contoh Connection String:**
```
postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

---

## 2. 🔧 Deploy Backend ke Vercel

### A. Setup Project Backend
1. **Buka** [vercel.com](https://vercel.com)
2. **Login** dengan GitHub account
3. **Klik** "New Project"
4. **Import** repository: `pwa88ku/pw88-push-system`
5. **Konfigurasi** project:
   - Project Name: `pwa-push-backend`
   - Framework Preset: `Other`
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### B. Setup Environment Variables Backend
**Klik** "Environment Variables" dan tambahkan:

```env
# Database (dari Supabase)
DATABASE_URL=postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:5432/postgres

# Server Config
NODE_ENV=production
PORT=3001

# JWT Secrets (generate dengan: openssl rand -base64 32)
JWT_SECRET=your-32-char-jwt-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-32-char-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=7d

# VAPID Keys (sudah di-generate)
VAPID_PUBLIC_KEY=BAO5ZkC-EXAVn87AKEqZxHpmZszv-UVxnpmmNvm9xjpLE4sgoW5wJqz-ESTjG411Ncm9kCRc2PQ4e1mX73N7ghw
VAPID_PRIVATE_KEY=Nhnhr75wWVz8S3t3htIH-Njy03-Esazh8rrSL3CUGSc
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-here
CORS_ORIGIN=https://your-frontend-url.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### C. Deploy Backend
1. **Klik** "Deploy"
2. **Tunggu** hingga deployment selesai
3. **Copy** URL backend (contoh: `https://pwa-push-backend.vercel.app`)
4. **Test** backend dengan mengakses: `https://your-backend-url.vercel.app/api/health`

---

## 3. 🌐 Deploy Frontend ke Vercel

### A. Setup Project Frontend
1. **Klik** "New Project" lagi di Vercel
2. **Import** repository yang sama: `pwa88ku/pw88-push-system`
3. **Konfigurasi** project:
   - Project Name: `pwa-push-frontend`
   - Framework Preset: `Next.js`
   - Root Directory: `/` (kosongkan atau root)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### B. Setup Environment Variables Frontend
**Tambahkan** environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

### C. Deploy Frontend
1. **Klik** "Deploy"
2. **Tunggu** hingga deployment selesai
3. **Copy** URL frontend (contoh: `https://pwa-push-frontend.vercel.app`)

---

## 4. 🔄 Update CORS Configuration

1. **Kembali** ke project backend di Vercel
2. **Buka** "Settings" > "Environment Variables"
3. **Edit** variable `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://your-actual-frontend-url.vercel.app
   ```
4. **Klik** "Save"
5. **Redeploy** backend (buka "Deployments" > klik "..." > "Redeploy")

---

## 5. 🧪 Testing Deployment

### A. Test Backend API
**Buka** browser dan akses:
```
https://your-backend-url.vercel.app/api/health
```
**Expected Response:**
```json
{"status":"OK","timestamp":"2024-01-XX"}
```

### B. Test Admin Login
1. **Buka** `https://your-frontend-url.vercel.app/admin/login`
2. **Login** dengan:
   - Email: `admin@pushnotify.com`
   - Password: `admin123`
3. **Pastikan** berhasil login dan redirect ke dashboard

### C. Test Dashboard
1. **Akses** dashboard admin
2. **Pastikan** statistik muncul (Total Clients, Active Clients, dll.)
3. **Test** pembuatan client baru
4. **Pastikan** tidak ada error di browser console

### D. Test API Endpoints
**Test** beberapa endpoint penting:

```bash
# Test admin login
curl -X POST https://your-backend-url.vercel.app/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pushnotify.com","password":"admin123"}'

# Test dashboard (dengan token dari login)
curl -X GET https://your-backend-url.vercel.app/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 6. 🔒 Security Checklist

### A. Database Security
- [ ] Ganti password default admin di Supabase
- [ ] Enable Row Level Security (RLS) jika diperlukan
- [ ] Setup database backup otomatis

### B. Application Security
- [ ] Pastikan JWT secrets kuat (32+ karakter)
- [ ] Verify CORS hanya mengizinkan domain yang benar
- [ ] Check rate limiting berfungsi
- [ ] Pastikan semua endpoint menggunakan HTTPS

### C. Environment Variables
- [ ] Pastikan tidak ada secrets yang ter-commit ke git
- [ ] Verify semua environment variables terisi dengan benar
- [ ] Test dengan environment variables production

---

## 7. 📊 Monitoring & Maintenance

### A. Setup Monitoring
1. **Supabase Dashboard**: Monitor database performance
2. **Vercel Analytics**: Monitor aplikasi performance
3. **Vercel Functions**: Check function logs untuk error

### B. Regular Maintenance
- **Weekly**: Check error logs
- **Monthly**: Review database performance
- **Quarterly**: Update dependencies

---

## 🆘 Troubleshooting

### Database Connection Issues
```
Error: connection to server failed
```
**Solusi:**
- Pastikan DATABASE_URL format benar
- Check Supabase project status
- Verify password dan connection string

### CORS Errors
```
Access to fetch blocked by CORS policy
```
**Solusi:**
- Update CORS_ORIGIN dengan domain yang benar
- Pastikan tidak ada trailing slash
- Redeploy backend setelah update

### Authentication Issues
```
Unauthorized / Invalid token
```
**Solusi:**
- Verify JWT_SECRET konsisten antara frontend dan backend
- Check token expiration settings
- Ensure admin user exists di database

### Build Errors
```
Build failed
```
**Solusi:**
- Check Node.js version compatibility
- Verify all dependencies installed
- Review build logs di Vercel

---

## ✅ Deployment Success Checklist

- [ ] ✅ Supabase project created dan schema running
- [ ] ✅ Backend deployed ke Vercel
- [ ] ✅ Frontend deployed ke Vercel
- [ ] ✅ CORS configuration updated
- [ ] ✅ Admin login berfungsi
- [ ] ✅ Dashboard menampilkan data
- [ ] ✅ API endpoints responding
- [ ] ✅ No console errors
- [ ] ✅ Push notifications ready

---

## 🎉 Selamat!

**Aplikasi PWA Push Notification SaaS Anda sekarang sudah live di production!**

### 📱 URLs Production:
- **Frontend**: `https://your-frontend-url.vercel.app`
- **Backend API**: `https://your-backend-url.vercel.app`
- **Admin Panel**: `https://your-frontend-url.vercel.app/admin`

### 🔑 Default Admin Credentials:
- **Email**: `admin@pushnotify.com`
- **Password**: `admin123`

**⚠️ Jangan lupa ganti password default setelah deployment!**

---

## 📞 Support

Jika mengalami masalah:
1. Check Vercel deployment logs
2. Check Supabase database logs
3. Check browser developer console
4. Review Network tab untuk API calls

**Happy Deploying! 🚀**