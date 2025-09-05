#!/usr/bin/env node

/**
 * Script untuk generate JWT secrets dan environment variables
 * Jalankan dengan: node generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('base64');
}

function generateEnvTemplate() {
    const jwtSecret = generateSecret(32);
    const jwtRefreshSecret = generateSecret(32);
    const sessionSecret = generateSecret(32);
    
    console.log('🔐 Generated JWT Secrets:');
    console.log('========================');
    console.log('');
    console.log('Copy dan paste ke Vercel Environment Variables:');
    console.log('');
    console.log(`JWT_SECRET=${jwtSecret}`);
    console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
    console.log(`SESSION_SECRET=${sessionSecret}`);
    console.log('');
    console.log('✅ Secrets berhasil di-generate!');
    console.log('📋 Simpan secrets ini dengan aman!');
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('1. Copy secrets di atas ke Vercel Environment Variables');
    console.log('2. Update DATABASE_URL dengan connection string dari Supabase');
    console.log('3. Update CORS_ORIGIN dengan URL frontend Anda');
    console.log('4. Deploy backend ke Vercel');
    console.log('');
}

// Jalankan script
if (require.main === module) {
    generateEnvTemplate();
}

module.exports = { generateSecret, generateEnvTemplate };