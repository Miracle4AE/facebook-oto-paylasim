import { NextResponse } from "next/server";
import { getAdminBootstrapPassword } from "@/lib/admin-default-account";
import { upsertBootstrapAdmin } from "@/services/admin/bootstrap-admin.service";

/**
 * Tek seferlik: Vercel’de veritabanına seed CLI erişimi olmadan yönetici oluşturur.
 * Vercel → Environment: ADMIN_BOOTSTRAP_SECRET (güçlü rastgele), isteğe bağlı ADMIN_BOOTSTRAP_PASSWORD.
 *
 * curl -X POST "https://SITE/api/admin/bootstrap" -H "Authorization: Bearer ADMIN_BOOTSTRAP_SECRET"
 */
export async function POST(req: Request) {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "ADMIN_BOOTSTRAP_SECRET tanımlı değil" }, { status: 503 });
  }

  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const pwd = getAdminBootstrapPassword();
    await upsertBootstrapAdmin(pwd);
    return NextResponse.json({
      ok: true,
      message: "Yönetici hesabı güncellendi (admin). İsterseniz Vercel’den ADMIN_BOOTSTRAP_SECRET kaldırın.",
    });
  } catch (e) {
    console.error("[api/admin/bootstrap]", e);
    return NextResponse.json({ ok: false, error: "Veritabanı hatası" }, { status: 500 });
  }
}
