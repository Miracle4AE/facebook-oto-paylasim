/**
 * Yönetici girişi: veritabanında `User.email` alanı bu değer (e-posta formatı zorunlu değil).
 * Şifre: seed ve tek seferlik bootstrap API için ortak.
 */
export const ADMIN_ACCOUNT_EMAIL = "admin";

export function getAdminBootstrapPassword(): string {
  return process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() || "Ae080919941827";
}
