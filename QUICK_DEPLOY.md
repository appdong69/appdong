# 🚀 Quick Deploy Guide

## 📋 Pre-Deployment Checklist

✅ **Sudah Selesai:**
- [x] VAPID Keys generated
- [x] Repository pushed to GitHub
- [x] Database schema ready
- [x] Environment templates created

## 🎯 Next Steps (Manual)

### 1. 🗄️ Setup Supabase (5 menit)

1. **Buka:** https://supabase.com
2. **Login** dan klik "New Project"
3. **Isi:**
   - Name: `pwa-push-notification`
   - Password: **[SIMPAN PASSWORD INI!]**
   - Region: Singapore/Tokyo
4. **Tunggu** project selesai (~2 menit)
5. **SQL Editor** → New Query → Copy paste dari `database/schema.sql` → Run
6. **Settings** → Database → Copy "Connection string"
7. **Ganti** `[YOUR-PASSWORD]` dengan password Anda

### 2. 🔧 Deploy Backend ke Vercel (10 menit)

1. **Buka:** https://vercel.com
2. **New Project** → Import `pwa88ku/pw88-push-system`
3. **Konfigurasi:**
   - Project Name: `pwa-push-backend`
   - Root Directory: `backend`
   - Framework: Other
4. **Environment Variables** (copy dari template di bawah):

```env
# Database (dari Supabase)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# Server
NODE_ENV=production
PORT=3001

# JWT (generate dengan script di bawah)
JWT_SECRET=GENERATE_32_CHAR_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=GENERATE_32_CHAR_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d

# VAPID (sudah ada)
VAPID_PUBLIC_KEY=BAO5ZkC-EXAVn87AKEqZxHpmZszv-UVxnpmmNvm9xjpLE4sgoW5wJqz-ESTjG411Ncm9kCRc2PQ4e1mX73N7ghw
VAPID_PRIVATE_KEY=Nhnhr75wWVz8S3t3htIH-Njy03-Esazh8rrSL3CUGSc
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=GENERATE_SESSION_SECRET
CORS_ORIGIN=https://your-frontend-url.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

5. **Deploy** → Tunggu selesai → Copy URL backend

### 3. 🌐 Deploy Frontend ke Vercel (5 menit)

1. **New Project** lagi → Import repository yang sama
2. **Konfigurasi:**
   - Project Name: `pwa-push-frontend`
   - Root Directory: `/` (kosong)
   - Framework: Next.js
3. **Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```
4. **Deploy** → Copy URL frontend

### 4. 🔄 Update CORS (2 menit)

1. **Kembali** ke backend project di Vercel
2. **Settings** → Environment Variables
3. **Edit** `CORS_ORIGIN` dengan URL frontend yang sebenarnya
4. **Redeploy** backend

### 5. ✅ Test Deployment (3 menit)

1. **Backend Health:** `https://your-backend-url.vercel.app/api/health`
2. **Admin Login:** `https://your-frontend-url.vercel.app/admin/login`
   - Email: `admin@pushnotify.com`
   - Password: `admin123`
3. **Dashboard:** Pastikan statistik muncul

---

## 🔐 Generate JWT Secrets

**Jalankan di terminal:**

```bash
# Generate JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT Refresh Secret
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate Session Secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

**Atau gunakan online:** https://generate-secret.vercel.app/32

---

## 🆘 Quick Troubleshooting

### ❌ Database Connection Error
```
Error: connection to server failed
```
**Fix:** Check DATABASE_URL format dan password

### ❌ CORS Error
```
Access blocked by CORS policy
```
**Fix:** Update CORS_ORIGIN di backend → Redeploy

### ❌ Build Failed
```
Build failed
```
**Fix:** Check Vercel build logs → Fix dependencies

### ❌ 500 Internal Server Error
```
Internal Server Error
```
**Fix:** Check Vercel function logs → Fix environment variables

---

## 📱 Production URLs

**Setelah deployment berhasil:**

- 🌐 **Frontend:** `https://pwa-push-frontend.vercel.app`
- 🔧 **Backend API:** `https://pwa-push-backend.vercel.app`
- 👨‍💼 **Admin Panel:** `https://pwa-push-frontend.vercel.app/admin`

**Default Login:**
- Email: `admin@pushnotify.com`
- Password: `admin123`

⚠️ **Ganti password setelah login pertama!**

---

## 🎉 Success Checklist

- [ ] ✅ Supabase project created
- [ ] ✅ Database schema running
- [ ] ✅ Backend deployed to Vercel
- [ ] ✅ Frontend deployed to Vercel
- [ ] ✅ CORS updated
- [ ] ✅ Admin login works
- [ ] ✅ Dashboard shows data
- [ ] ✅ No console errors

**Total Time: ~25 menit**

---

## 📞 Need Help?

1. Check **Vercel deployment logs**
2. Check **Supabase database logs**
3. Check **browser console** (F12)
4. Review **Network tab** for failed API calls

**Happy Deploying! 🚀**