/* eslint-disable no-console */
/**
 * Yerel geliştirme için .env üretir (secret'ları rastgele üretir).
 * Çalıştır: node scripts/write-local-env.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const nextAuth = crypto.randomBytes(32).toString("base64");
const cron = crypto.randomBytes(32).toString("base64");

const content = [
  `DATABASE_URL="file:./dev.db"`,
  `NEXTAUTH_URL="http://localhost:3000"`,
  `NEXTAUTH_SECRET="${nextAuth}"`,
  `CRON_SECRET="${cron}"`,
  `NEXT_PUBLIC_APP_NAME="Facebook Otomatik Paylaşım Paneli"`,
  "",
].join("\n");

fs.writeFileSync(path.join(root, ".env"), content, "utf8");
console.log("OK: .env yazıldı (yerel SQLite + yeni secret'lar).");
