"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { commitContentUpdateWithMedia, updateContentPost } from "@/actions/content";
import { contentPostSchema } from "@/lib/validations";
import type { ContentPostFormValues } from "@/lib/content-form";
import { toMediaRecordInputs, uploadPendingMediaWithRetry } from "@/lib/content-media-upload-pipeline";
import { ContentPostStatus } from "@/types/domain";
import { ContentExistingMedia, type ExistingMediaItem } from "@/components/content/content-existing-media";
import { ContentFormFields } from "@/components/content/content-form-fields";
import { ContentPreviewCard } from "@/components/content/content-preview-card";
import { UploadBox } from "@/components/content/upload-box";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";

const schema = contentPostSchema;

type InitialContent = {
  title: string | null;
  body: string;
  status: string;
};

type Props = {
  contentId: string;
  initial: InitialContent;
  initialMedia: ExistingMediaItem[];
};

export function EditContentForm({ contentId, initial, initialMedia }: Props) {
  const router = useRouter();
  const submitLock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [media, setMedia] = useState<ExistingMediaItem[]>(initialMedia);

  const defaultValues = useMemo<ContentPostFormValues>(() => {
    let status: ContentPostFormValues["status"] = ContentPostStatus.DRAFT;
    if (
      initial.status === ContentPostStatus.SCHEDULED ||
      initial.status === ContentPostStatus.PUBLISHED ||
      initial.status === ContentPostStatus.FAILED ||
      initial.status === ContentPostStatus.DRAFT
    ) {
      status = initial.status;
    }
    return {
      title: initial.title ?? "",
      body: initial.body,
      status,
    };
  }, [initial]);

  const form = useForm<ContentPostFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

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
        const updated = await updateContentPost(contentId, values);
        if (!updated.ok) {
          toast.error(updated.error ?? "İçerik güncellenemedi. Oturumunuzu kontrol edip tekrar deneyin.");
          return;
        }
        toast.success("İçerik güncellendi.");
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
        const committed = await commitContentUpdateWithMedia(contentId, values, records);
        if (!committed.ok) {
          toast.error(
            committed.error ??
              "Metin ve yüklenen medya kaydedilemedi. Aşağıdaki dosyalar kuyrukta kaldı; tekrar kaydetmeyi deneyin.",
          );
          router.refresh();
          return;
        }
        router.refresh();
        if (failures.length === 0) {
          toast.success("İçerik ve yeni medya kaydedildi.");
          router.push("/icerikler");
          router.refresh();
          return;
        }
        const detail = failures.map((f) => `${f.fileName}: ${f.message}`).join("\n");
        toast.warning("Metin ve yüklenen dosyalar kaydedildi; bazı dosyalar atlandı.", {
          description: `${detail}\n\nKuyrukta kalan dosyaları tekrar seçip kaydedebilirsiniz.`,
          duration: 14_000,
        });
        return;
      }

      const textOnly = await updateContentPost(contentId, values);
      if (!textOnly.ok) {
        toast.error(textOnly.error ?? "Metin güncellenemedi.");
        router.refresh();
        return;
      }
      router.refresh();
      const detail = failures.map((f) => `${f.fileName}: ${f.message}`).join("\n");
      toast.warning("Metin kaydedildi; seçilen dosyalar yüklenemedi.", {
        description: `${detail}\n\nAğ düzelince aynı dosyaları tekrar ekleyip kaydedebilirsiniz.`,
        duration: 14_000,
      });
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
          <CardDescription>Metin ve durumu güncelleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ContentFormFields control={form.control} disabled={loading} />
              <Button type="submit" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <ContentExistingMedia
          items={media}
          disabled={loading}
          onRemoved={(id) => {
            setMedia((prev) => prev.filter((m) => m.id !== id));
            router.refresh();
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Yeni medya</CardTitle>
            <CardDescription>
              Önce dosyalar yüklenir (otomatik yeniden deneme), ardından metin ve medya tek kayıtta birleştirilir.
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
