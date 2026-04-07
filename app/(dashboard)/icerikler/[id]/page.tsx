import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth-options";
import { isValidContentPostId } from "@/lib/content-id";
import { getContentPostDetailForUser } from "@/services/content/content-detail.service";
import { getActiveGroupTargetsForUser } from "@/services/targets/group-targets.service";
import { ContentDetailView } from "@/components/content/content-detail-view";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: { id: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const raw = params.id?.trim() ?? "";
  if (!session?.user?.id || !isValidContentPostId(raw)) {
    return { title: "İçerik" };
  }
  const detail = await getContentPostDetailForUser({
    userId: session.user.id,
    postId: raw,
  });
  if (!detail) {
    return { title: "İçerik bulunamadı", robots: { index: false, follow: false } };
  }
  const title = detail.title?.trim() || "Başlıksız içerik";
  const body = detail.body.trim();
  return {
    title: `${title} · İçerik`,
    description: body.length > 0 ? body.slice(0, 160) : "İçerik önizlemesi",
    robots: { index: true, follow: true },
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const contentId = params.id.trim();
  if (!isValidContentPostId(contentId)) {
    notFound();
  }

  const [detail, groupTargets] = await Promise.all([
    getContentPostDetailForUser({
      userId: session.user.id,
      postId: contentId,
    }),
    getActiveGroupTargetsForUser(session.user.id),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" className="-ml-2 w-fit" asChild>
          <Link href="/icerikler">
            <ArrowLeft className="mr-2 h-4 w-4" />
            İçeriklere dön
          </Link>
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          İçeriğinizi görüntüleyin, düzenleyin veya paylaşım simülasyonu çalıştırın.
        </p>
      </div>

      <ContentDetailView detail={detail} groupTargets={groupTargets} />
    </div>
  );
}
