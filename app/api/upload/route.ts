import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { saveUploadedFile } from "@/services/media/media.service";
import { MediaKind } from "@/types/domain";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Oturum gerekli" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kindRaw = String(formData.get("kind") ?? "IMAGE");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Dosya bulunamadı" }, { status: 400 });
  }

  const kind: MediaKind = kindRaw === "VIDEO" ? MediaKind.VIDEO : MediaKind.IMAGE;
  const stored = await saveUploadedFile(file, kind);
  return NextResponse.json({ ok: true, media: stored });
}
