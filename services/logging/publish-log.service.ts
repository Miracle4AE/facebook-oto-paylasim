import { prisma } from "@/lib/prisma";
import type { PublishLogStatus } from "@/types/domain";

export async function logPublishResult(input: {
  publishJobId: string;
  contentPostId: string;
  targetChannelId: string;
  status: PublishLogStatus;
  message?: string;
  errorDetail?: string;
  payloadJson?: string;
}) {
  return prisma.publishLog.create({
    data: {
      publishJobId: input.publishJobId,
      contentPostId: input.contentPostId,
      targetChannelId: input.targetChannelId,
      status: input.status,
      message: input.message,
      errorDetail: input.errorDetail,
      payloadJson: input.payloadJson,
    },
  });
}
