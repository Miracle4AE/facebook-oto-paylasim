"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createContentPost, createContentWithMedia } from "@/actions/content";
import { contentPostSchema } from "@/lib/validations";
import type { ContentPostFormValues } from "@/lib/content-form";
import { toMediaRecordInputs, uploadPendingMediaWithRetry } from "@/lib/content-media-upload-pipeline";
import { ContentPostStatus } from "@/types/domain";
import { ContentFormFields } from "@/components/content/content-form-fields";
import { ContentPreviewCard } from "@/components/content/content-preview-card";
import { UploadBox } from "@/components/content/upload-box";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";

const schema = contentPostSchema;

export function NewContentForm() {
  const router = useRouter();
  const submitLock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);

  const form = useForm<ContentPostFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      body: "",
      status: ContentPostStatus.DRAFT,
    },
  });

  const bodyWatch = form.watch("body");

  function mergeFiles(prev: File[], incoming: FileList | null) {
    if (!incoming?.length) return prev;
    return [...prev, ...Array.from(incoming)];
  }

  async function onSubmit(values: ContentPostFormValues) {
    if (submitLock.current) return;
    submitLock.current = true;
    setLoading(true);
    try {
      const pendingCount = images.length + videos.length;
      if (pendingCount === 0) {
        const created = await createContentPost(values);
        if (!created.ok || !created.id) {
          toast.error(created.error ?? "Kayıt oluşturulamadı. Bilgilerinizi kontrol edin.");
          return;
        }
        toast.success("İçerik oluşturuldu.");
        router.push("/icerikler");
        router.refresh();
        return;
      }

      const { success, failures, remainingImages, remainingVideos } = await uploadPendingMediaWithRetry(
        images,
        videos,
      );
      setImages(remainingImages);
      setVideos(remainingVideos);

      if (success.length > 0) {
        const records = toMediaRecordInputs(success);
        const created = await createContentWithMedia(values, records);
        if (!created.ok || !created.id) {
          toast.error(
            created.error ??
              "İçerik ve medya kaydedilemedi. Yüklenen dosyalar sunucuda temizlendi; formu tekrar göndermeyi deneyin.",
          );
          return;
        }
        if (failures.length === 0) {
          toast.success("İçerik ve medya kaydedildi.");
          router.push("/icerikler");
          router.refresh();
          return;
        }
        const detail = failures.map((f) => `${f.fileName}: ${f.message}`).join("\n");
        toast.warning("İçerik oluşturuldu; bazı dosyalar yüklenemedi.", {
          description: `${detail}\n\nEksik dosyaları düzenleme sayfasından tekrar ekleyebilirsiniz.`,
          duration: 14_000,
        });
        router.push(`/icerikler/${created.id}/duzenle`);
        router.refresh();
        return;
      }

      const textOnly = await createContentPost(values);
      if (!textOnly.ok || !textOnly.id) {
        toast.error(textOnly.error ?? "Kayıt oluşturulamadı.");
        return;
      }
      const detail = failures.map((f) => `${f.fileName}: ${f.message}`).join("\n");
      toast.warning("İçerik oluşturuldu; seçilen dosyalar yüklenemedi.", {
        description: `${detail}\n\nDüzenleme sayfasından dosyaları tekrar ekleyebilirsiniz.`,
        duration: 14_000,
      });
      router.push(`/icerikler/${textOnly.id}/duzenle`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>İçerik bilgileri</CardTitle>
          <CardDescription>Metin ve durum. Medya dosyalarını sağdan ekleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ContentFormFields control={form.control} disabled={loading} />
              <Button type="submit" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Medya</CardTitle>
            <CardDescription>
              Önce dosyalar yüklenir (otomatik yeniden deneme), ardından içerik ve medya tek kayıtta oluşturulur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Fotoğraflar ({images.length})</p>
              <UploadBox
                accept="image/*"
                kind="IMAGE"
                disabled={loading}
                onFiles={(files) => setImages((p) => mergeFiles(p, files))}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Videolar ({videos.length})</p>
              <UploadBox
                accept="video/*"
                kind="VIDEO"
                disabled={loading}
                onFiles={(files) => setVideos((p) => mergeFiles(p, files))}
              />
            </div>
          </CardContent>
        </Card>

        <ContentPreviewCard body={bodyWatch} />
      </div>
    </div>
  );
}
