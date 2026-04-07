import { buildShareablePlainText } from "@/lib/sharing/facebook-manual-share";

export function resolveEffectiveGroupShareText(params: {
  title: string | null;
  body: string;
  customOverride: string | undefined;
}): string {
  const trimmed = params.customOverride?.trim() ?? "";
  if (trimmed.length > 0) return trimmed;
  return buildShareablePlainText({ title: params.title, body: params.body });
}
