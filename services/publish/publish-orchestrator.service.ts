import { prisma } from "@/lib/prisma";
import { computeNextRetryAt } from "@/lib/publish-retry";
import { getFacebookPublishService } from "@/services/facebook/facebook-publish.factory";
import { resolveFacebookPublishContext } from "@/services/facebook/facebook-credential-resolver";
import { reconcileContentPostAfterPublishJob } from "@/services/publish/publish-group-reconcile.service";
import { logPublishResult } from "@/services/logging/publish-log.service";
import { appLogger } from "@/services/logging/app-logger";
import { shouldRetryFacebookPublish } from "@/services/facebook/facebook-publish-retry-policy";
import { getFacebookPublishUserMessage } from "@/services/facebook/facebook-user-messages";
import type { FacebookPublishResult } from "@/services/facebook/facebook-publish.types";
import { PublishJobStatus, PublishLogStatus } from "@/types/domain";

function serializePublishResultForLog(result: FacebookPublishResult, kind: "success" | "failure"): string {
  if (kind === "success") {
    return JSON.stringify({
      telemetry: result.telemetry ?? null,
      graph: result.raw ?? null,
    });
  }
  return JSON.stringify({
    errorCode: result.errorCode,
    technicalMessage: result.errorMessage,
    userMessage: result.userMessage ?? getFacebookPublishUserMessage(result.errorCode),
    telemetry: result.telemetry ?? null,
    graph: result.raw ?? null,
  });
}

/**
 * Claim sonrası job PROCESSING durumundadır; tek iş yürütme.
 */
export async function executePublishJob(jobId: string): Promise<void> {
  const job = await prisma.publishJob.findUnique({
    where: { id: jobId },
    include: {
      contentPost: { include: { mediaFiles: true } },
      targetChannel: true,
    },
  });
  if (!job) {
    appLogger.warn("publish.job.missing", { jobId });
    return;
  }

  if (job.status !== PublishJobStatus.PROCESSING) {
    appLogger.warn("publish.job.unexpected_status", {
      jobId,
      status: job.status,
    });
    return;
  }

  const userId = job.contentPost.userId;

  appLogger.info("publish.job.start", {
    jobId,
    contentPostId: job.contentPostId,
    targetChannelId: job.targetChannelId,
    attempt: String(job.attempts),
    publishGroupId: (job as { publishGroupId?: string | null }).publishGroupId ?? "",
  });

  try {
    const ctx = await resolveFacebookPublishContext(job.targetChannelId, userId);
    if (!ctx) {
      const err =
        "Facebook hesabı veya sayfa erişim anahtarı bulunamadı. Entegrasyon ve hedef ayarlarını kontrol edin.";
      await prisma.publishJob.update({
        where: { id: jobId },
        data: {
          status: PublishJobStatus.FAILED,
          lastError: err,
          nextRetryAt: null,
        },
      });
      await logPublishResult({
        publishJobId: jobId,
        contentPostId: job.contentPostId,
        targetChannelId: job.targetChannelId,
        status: PublishLogStatus.FAILED,
        errorDetail: err,
        payloadJson: JSON.stringify({ reason: "missing_facebook_context" }),
      });
      appLogger.warn("publish.job.no_facebook_context", {
        jobId,
        contentPostId: job.contentPostId,
        targetChannelId: job.targetChannelId,
      });
      await reconcileContentPostAfterPublishJob(jobId);
      return;
    }

    const service = getFacebookPublishService();
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const mediaUrls = job.contentPost.mediaFiles.map((m) =>
      m.publicUrl.startsWith("http") ? m.publicUrl : `${base}${m.publicUrl}`,
    );

    const result = await service.publish(ctx, {
      text: job.contentPost.body,
      mediaUrls,
      mediaKinds: job.contentPost.mediaFiles.map((m) => (m.kind === "VIDEO" ? "VIDEO" : "IMAGE")),
    });

    if (result.success) {
      await prisma.publishJob.update({
        where: { id: jobId },
        data: { status: PublishJobStatus.SUCCESS, lastError: null, nextRetryAt: null },
      });
      await logPublishResult({
        publishJobId: jobId,
        contentPostId: job.contentPostId,
        targetChannelId: job.targetChannelId,
        status: PublishLogStatus.SUCCESS,
        message: result.remotePostId ? `Yayın ID: ${result.remotePostId}` : "Gönderim tamamlandı.",
        payloadJson: serializePublishResultForLog(result, "success"),
      });
      appLogger.info("publish.job.success", {
        jobId,
        contentPostId: job.contentPostId,
        targetChannelId: job.targetChannelId,
        remotePostId: result.remotePostId ?? "",
        graphEndpoint: result.telemetry?.endpoint ?? "",
        durationMs: result.telemetry?.durationMs != null ? String(result.telemetry.durationMs) : "",
      });
    } else {
      await recordPublishFailure(
        jobId,
        job.contentPostId,
        job.targetChannelId,
        job.attempts,
        job.maxAttempts,
        result,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Beklenmeyen hata";
    const synthetic: FacebookPublishResult = {
      success: false,
      errorCode: "GRAPH_ERROR",
      errorMessage: msg,
      userMessage:
        "Yayın sırasında beklenmeyen bir sunucu hatası oluştu. Teknik ayrıntılar günlük kayıtlarında saklanır.",
    };
    appLogger.error(
      "publish.job.exception",
      {
        jobId,
        contentPostId: job.contentPostId,
        targetChannelId: job.targetChannelId,
        attempt: String(job.attempts),
      },
      e instanceof Error ? e : new Error(String(e)),
    );
    await recordPublishFailure(
      jobId,
      job.contentPostId,
      job.targetChannelId,
      job.attempts,
      job.maxAttempts,
      synthetic,
    );
  }

  await reconcileContentPostAfterPublishJob(jobId);
}

async function recordPublishFailure(
  jobId: string,
  contentPostId: string,
  targetChannelId: string,
  attempts: number,
  maxAttempts: number,
  result: FacebookPublishResult,
): Promise<void> {
  const userFacing = result.userMessage ?? getFacebookPublishUserMessage(result.errorCode);
  const retryable = shouldRetryFacebookPublish(result.errorCode);
  const attemptsExhausted = attempts >= maxAttempts;
  /** Kalıcı hata veya deneme hakkı bittiğinde terminal */
  const terminal = attemptsExhausted || !retryable;
  const payloadJson = serializePublishResultForLog(result, "failure");

  appLogger.warn("publish.job.failure_eval", {
    jobId,
    contentPostId,
    targetChannelId,
    errorCode: result.errorCode ?? "",
    retryable: retryable ? "true" : "false",
    terminal: terminal ? "true" : "false",
    attempts: String(attempts),
    maxAttempts: String(maxAttempts),
    graphEndpoint: result.telemetry?.endpoint ?? "",
    fbtraceId: result.telemetry?.fbtraceId ?? "",
  });

  if (terminal) {
    await prisma.publishJob.update({
      where: { id: jobId },
      data: {
        status: PublishJobStatus.FAILED,
        lastError: userFacing,
        nextRetryAt: null,
      },
    });
    await logPublishResult({
      publishJobId: jobId,
      contentPostId,
      targetChannelId,
      status: PublishLogStatus.FAILED,
      errorDetail: userFacing,
      payloadJson,
    });
    appLogger.warn("publish.job.failed_final", {
      jobId,
      contentPostId,
      targetChannelId,
      attempts: String(attempts),
      maxAttempts: String(maxAttempts),
      errorCode: result.errorCode ?? "",
    });
    return;
  }

  const nextAt = computeNextRetryAt(attempts);
  await prisma.publishJob.update({
    where: { id: jobId },
    data: {
      status: PublishJobStatus.RETRY_SCHEDULED,
      lastError: userFacing,
      nextRetryAt: nextAt,
    },
  });
  await logPublishResult({
    publishJobId: jobId,
    contentPostId,
    targetChannelId,
    status: PublishLogStatus.FAILED,
    errorDetail: `${userFacing} (yeniden deneme planlandı)`,
    payloadJson,
  });
  appLogger.warn("publish.job.retry_scheduled", {
    jobId,
    contentPostId,
    targetChannelId,
    attempt: String(attempts),
    nextRetryAt: nextAt.toISOString(),
    errorCode: result.errorCode ?? "",
  });
}
