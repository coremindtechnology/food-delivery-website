const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

// Define AdminUser schema matching the project's model
const adminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String },
  role: { type: String, default: 'super_admin' },
  isActive: { type: Boolean, default: true },
});

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const N = 16384, r = 8, p = 1, keylen = 64;
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N, r, p }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${N}$${r}$${p}$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const email = 'admin@gmail.com';
    const plainPassword = 'Admin@12';
    const passwordHash = await hashPassword(plainPassword);

    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.isActive = true;
      await existing.save();
      console.log('Updated existing admin user');
    } else {
      const newAdmin = new AdminUser({
        email: email.toLowerCase(),
        passwordHash,
        phone: '0000000000',
        role: 'super_admin',
        isActive: true,
      });
      await newAdmin.save();
      console.log('Created new admin user');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
