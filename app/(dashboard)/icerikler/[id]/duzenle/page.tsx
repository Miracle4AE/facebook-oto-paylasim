import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth-options";
import { isValidContentPostId } from "@/lib/content-id";
import { prisma } from "@/lib/prisma";
import { EditContentForm } from "@/components/content/edit-content-form";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: { id: string };
};

export default async function EditContentPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const contentId = params.id.trim();

  if (!isValidContentPostId(contentId)) {
    notFound();
  }

  const post = await prisma.contentPost.findFirst({
    where: { id: contentId, userId: session.user.id },
    include: { mediaFiles: { orderBy: { createdAt: "asc" } } },
  });

  if (!post) {
    notFound();
  }

  const initialMedia = post.mediaFiles.map((m) => ({
    id: m.id,
    publicUrl: m.publicUrl,
    kind: m.kind,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" className="-ml-2 w-fit" asChild>
            <Link href="/icerikler">
              <ArrowLeft className="mr-2 h-4 w-4" />
              İçeriklere dön
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">İçeriği düzenle</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Metin, durum ve medya eklerini güncelleyin. Metin kaydı tamamlanır; medya yüklemeleri ayrı işlenir.
          </p>
        </div>
      </div>

      <EditContentForm
        contentId={post.id}
        initial={{
          title: post.title,
          body: post.body,
          status: post.status,
        }}
        initialMedia={initialMedia}
      />
    </div>
  );
}
