export const ContentGroupShareLogKind = {
  OPENED: "OPENED",
  MARKED_DONE: "MARKED_DONE",
  BULK_FLOW_STARTED: "BULK_FLOW_STARTED",
} as const;

export type ContentGroupShareLogKind =
  (typeof ContentGroupShareLogKind)[keyof typeof ContentGroupShareLogKind];

export type GroupTargetShareStat = {
  targetChannelId: string;
  openCount: number;
  markedDoneCount: number;
  lastOpenedAt: Date | null;
  lastMarkedAt: Date | null;
};
