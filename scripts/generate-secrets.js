/* eslint-disable no-console */
const crypto = require("crypto");
const a = crypto.randomBytes(32).toString("base64");
const b = crypto.randomBytes(32).toString("base64");
console.log("");
console.log("Aşağıdaki iki satırı kopyala: önce .env içine, Vercel'de de ayrı ayrı Key/Value olarak gir.");
console.log("");
console.log(`NEXTAUTH_SECRET="${a}"`);
console.log(`CRON_SECRET="${b}"`);
console.log("");
