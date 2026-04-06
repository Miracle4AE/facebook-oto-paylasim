import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export type PaymentRow = {
  id: string;
  amount: string;
  currency: string;
  paidAt: Date;
  method: string;
  status: string;
  note: string | null;
  user: { id: string; name: string | null; email: string };
  plan: { name: string; code: string } | null;
};

export async function listPaymentRecords(): Promise<PaymentRow[]> {
  const rows = await db.paymentRecord.findMany({
    orderBy: { paidAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { name: true, code: true } },
    },
  });
  return rows.map((r: (typeof rows)[number]) => ({
    ...r,
    amount: r.amount.toString(),
  }));
}

export async function createPaymentRecord(input: {
  userId: string;
  planId?: string | null;
  amount: number;
  currency?: string;
  paidAt: Date;
  method: string;
  status: string;
  note?: string | null;
}) {
  return db.paymentRecord.create({
    data: {
      userId: input.userId,
      planId: input.planId ?? null,
      amount: input.amount,
      currency: input.currency ?? "TRY",
      paidAt: input.paidAt,
      method: input.method,
      status: input.status,
      note: input.note ?? null,
    },
  });
}

export async function updatePaymentRecord(
  id: string,
  data: { status?: string; note?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db.paymentRecord.findUnique({ where: { id }, select: { id: true } });
  if (!row) return { ok: false, error: "Kayıt bulunamadı" };
  await db.paymentRecord.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.note !== undefined ? { note: data.note } : {}),
    },
  });
  return { ok: true };
}
