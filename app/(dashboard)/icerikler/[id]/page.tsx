import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth-options";
import { isValidContentPostId } from "@/lib/content-id";
import { getContentPostDetailForUser } from "@/services/content/content-detail.service";
import { getGroupShareDraftsMapForContent, getGroupShareStatsForTargets } from "@/services/content/group-share.service";
import { getActiveGroupTargetsForUser } from "@/services/targets/group-targets.service";
import { ContentDetailView } from "@/components/content/content-detail-view";
import { ContentFlowOnboarding } from "@/components/onboarding/content-flow-onboarding";
import { ActivationContentHint } from "@/components/activation/activation-content-hint";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
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

export default async function ContentDetailPage({ params, searchParams }: PageProps) {
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

  const [groupShareDraftByTargetId, groupShareStats] = await Promise.all([
    getGroupShareDraftsMapForContent({ userId: session.user.id, contentPostId: contentId }),
    getGroupShareStatsForTargets({
      userId: session.user.id,
      targetChannelIds: groupTargets.map((g) => g.id),
    }),
  ]);
  const groupShareStatsByTargetId = Object.fromEntries(groupShareStats.map((s) => [s.targetChannelId, s]));

  const activationParam = searchParams?.activation;
  const activationQuickstart =
    typeof activationParam === "string" ? activationParam === "quickstart" : activationParam?.[0] === "quickstart";

  return (
    <div className="space-y-8">
      <ActivationContentHint show={activationQuickstart} />
      <ContentFlowOnboarding />
      <div>
        <Button variant="ghost" className="-ml-2 w-fit" asChild>
          <Link href="/icerikler">
            <ArrowLeft className="mr-2 h-4 w-4" />
            İçeriklere dön
          </Link>
        </Button>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Metninizi gruplara hızlı taşıyın; aşağıda &quot;Gruplarda paylaş&quot; ile aynı içeriği çok kanala dakikalar
          içinde yayın.
        </p>
      </div>

      <ContentDetailView
        detail={detail}
        groupTargets={groupTargets}
        groupShareDraftByTargetId={groupShareDraftByTargetId}
        groupShareStatsByTargetId={groupShareStatsByTargetId}
      />
    </div>
  );
}
