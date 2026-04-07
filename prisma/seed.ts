import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ContentPostStatus,
  MediaKind,
  PublishJobStatus,
  PublishLogStatus,
  ScheduleRecurrence,
  SubscriptionPlanCode,
  TargetChannelType,
  UserRole,
} from "../types/domain";
import { prisma } from "../lib/prisma";
import { encryptSecret } from "../lib/crypto/token-vault";

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const passwordHash = await bcrypt.hash("Ae080919941827", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin" },
    update: {
      passwordHash,
      name: "Yönetici",
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
    } as Prisma.UserUncheckedUpdateInput,
    create: {
      email: "admin",
      passwordHash,
      name: "Yönetici",
      timezone: "Europe/Istanbul",
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
    } as Prisma.UserUncheckedCreateInput,
  });

  await prisma.user.deleteMany({ where: { email: "demo@paylasim.app" } });

  await prisma.appSetting.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      defaultTimezone: "Europe/Istanbul",
      notifyEmail: true,
      notifyInApp: true,
      notifyPublishResult: true,
    },
  });

  await db.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      defaultAppName: "Facebook Otomatik Paylaşım Paneli",
      supportEmail: "destek@ornek.com",
      defaultTimezone: "Europe/Istanbul",
      publishRetryMax: 3,
      logRetentionDays: 90,
      maintenanceMode: false,
      facebookModeNote: "mock",
    },
  });

  const planSeeds = [
    {
      code: SubscriptionPlanCode.TRIAL,
      name: "Deneme",
      maxTargetChannels: 2,
      dailyPublishLimit: 5,
      sortOrder: 0,
      description: "Kısa süreli deneme",
    },
    {
      code: SubscriptionPlanCode.BASIC,
      name: "Temel",
      maxTargetChannels: 5,
      dailyPublishLimit: 15,
      sortOrder: 1,
      description: "Küçük işletmeler",
    },
    {
      code: SubscriptionPlanCode.PRO,
      name: "Profesyonel",
      maxTargetChannels: 20,
      dailyPublishLimit: 50,
      sortOrder: 2,
      description: "Yoğun kullanım",
    },
    {
      code: SubscriptionPlanCode.PREMIUM,
      name: "Premium",
      maxTargetChannels: 100,
      dailyPublishLimit: 200,
      sortOrder: 3,
      description: "Kurumsal",
    },
    {
      code: SubscriptionPlanCode.CUSTOM,
      name: "Özel",
      maxTargetChannels: 999,
      dailyPublishLimit: 999,
      sortOrder: 4,
      description: "Anlaşmaya göre",
    },
  ] as const;

  for (const p of planSeeds) {
    await db.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        maxTargetChannels: p.maxTargetChannels,
        dailyPublishLimit: p.dailyPublishLimit,
        sortOrder: p.sortOrder,
        description: p.description,
        isActive: true,
      },
      create: {
        code: p.code,
        name: p.name,
        maxTargetChannels: p.maxTargetChannels,
        dailyPublishLimit: p.dailyPublishLimit,
        sortOrder: p.sortOrder,
        description: p.description,
        isActive: true,
      },
    });
  }

  const proPlan = await db.subscriptionPlan.findUnique({
    where: { code: SubscriptionPlanCode.PRO },
  });
  if (proPlan) {
    await db.userSubscription.deleteMany({ where: { userId: user.id } });
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    await db.userSubscription.create({
      data: {
        userId: user.id,
        planId: proPlan.id,
        startAt: new Date(),
        endAt: end,
        paymentStatus: "PAID",
        paymentNote: "Seed verisi",
        autoRenew: false,
      },
    });
  }

  const fb = await prisma.facebookAccount.upsert({
    where: { id: "seed-fb-1" },
    update: {},
    create: {
      id: "seed-fb-1",
      userId: user.id,
      label: "Ana İş Sayfası",
      accessTokenEnc: encryptSecret("PLACEHOLDER_TOKEN_META_GRAPH_API_ILE_DEGISTIRIN"),
      pageId: "1234567890",
      externalId: "page_123",
      isActive: true,
      notes: "Üretimde token şifreli saklanmalıdır.",
    } as unknown as Prisma.FacebookAccountUncheckedCreateInput,
  });

  const t1 = await prisma.targetChannel.upsert({
    where: { id: "seed-target-1" },
    update: {},
    create: {
      id: "seed-target-1",
      userId: user.id,
      facebookAccountId: fb.id,
      name: "Marka Sayfası",
      url: "https://facebook.com/your-page",
      channelType: TargetChannelType.PAGE,
      pageId: "1234567890",
      isActive: true,
      notes: "Resmi API ile sayfa gönderimi desteklenir.",
    },
  });

  const t2 = await prisma.targetChannel.upsert({
    where: { id: "seed-target-2" },
    update: {},
    create: {
      id: "seed-target-2",
      userId: user.id,
      name: "Topluluk Grubu",
      url: "https://facebook.com/groups/example",
      channelType: TargetChannelType.GROUP,
      isActive: true,
      notes: "Grup paylaşımları Meta politikalarına tabidir.",
    },
  });

  const post1 = await prisma.contentPost.upsert({
    where: { id: "seed-content-1" },
    update: {},
    create: {
      id: "seed-content-1",
      userId: user.id,
      title: "Haftalık kampanya",
      body: "Bu hafta seçili ürünlerde %20 indirim! Detaylar için mesaj atın.",
      status: ContentPostStatus.SCHEDULED,
    },
  });

  await prisma.contentPost.upsert({
    where: { id: "seed-content-2" },
    update: {},
    create: {
      id: "seed-content-2",
      userId: user.id,
      title: "Taslak duyuru",
      body: "Yayına alınmayı bekleyen içerik.",
      status: ContentPostStatus.DRAFT,
    },
  });

  const timesJson = JSON.stringify(["09:30", "18:00"]);
  const targetsJson = JSON.stringify([t1.id, t2.id]);

  const slot = await prisma.scheduleSlot.upsert({
    where: { id: "seed-slot-1" },
    update: {},
    create: {
      id: "seed-slot-1",
      userId: user.id,
      contentPostId: post1.id,
      timezone: "Europe/Istanbul",
      recurrence: ScheduleRecurrence.DAILY,
      timesOfDay: timesJson,
      daysOfWeek: null,
      targetChannelIds: targetsJson,
      isActive: true,
    },
  });

  const past = new Date(Date.now() - 1000 * 60 * 60 * 2);
  const job = await prisma.publishJob.upsert({
    where: { idempotencyKey: "seed-job-1" },
    update: {},
    create: {
      id: "seed-job-done",
      contentPostId: post1.id,
      targetChannelId: t1.id,
      scheduleSlotId: slot.id,
      status: PublishJobStatus.SUCCESS,
      scheduledFor: past,
      attempts: 1,
      maxAttempts: 3,
      idempotencyKey: "seed-job-1",
      publishGroupId: "seed_group_demo",
    } as Prisma.PublishJobUncheckedCreateInput,
  });

  await prisma.publishLog.upsert({
    where: { id: "seed-log-1" },
    update: {},
    create: {
      id: "seed-log-1",
      publishJobId: job.id,
      contentPostId: post1.id,
      targetChannelId: t1.id,
      status: PublishLogStatus.SUCCESS,
      message: "Mock servis ile başarılı gönderim simülasyonu.",
      payloadJson: JSON.stringify({ mode: "mock" }),
    },
  });

  await prisma.mediaFile.upsert({
    where: { id: "seed-media-1" },
    update: {},
    create: {
      id: "seed-media-1",
      contentPostId: post1.id,
      storageKey: "seed/placeholder.jpg",
      publicUrl: "/uploads/placeholder.svg",
      mimeType: "image/svg+xml",
      kind: MediaKind.IMAGE,
      sizeBytes: 512,
    },
  });

  console.log("Seed tamam:", user.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
