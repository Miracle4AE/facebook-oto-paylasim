import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) {
      return buf;
    }
    console.warn(
      "[token-vault] TOKEN_ENCRYPTION_KEY geçersiz (32 bayt değil); NEXTAUTH_SECRET türetilmiş anahtar kullanılıyor.",
    );
  }
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY (geçerli 32 bayt base64) veya NEXTAUTH_SECRET tanımlı olmalıdır.");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

/**
 * UTF-8 metni AES-256-GCM ile şifreler; çıktı: base64(iv || ciphertext || tag)
 */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

/**
 * encryptSecret çıktısını çözer. Eski düz metin kayıtlar için: şifre çözülemezse girdi olduğu gibi döner (yalnızca geliştirme geçişi).
 */
export function decryptSecret(stored: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return "";
  try {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) {
      return trimmed;
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(buf.length - AUTH_TAG_LEN);
    const data = buf.subarray(IV_LEN, buf.length - AUTH_TAG_LEN);
    const key = getKey();
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return trimmed;
  }
}
