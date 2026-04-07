/** İlk içerik detayı / akış rehberi — sunucu tarafı yok; yalnızca tarayıcı. */
export const CONTENT_FLOW_ONBOARDING_STORAGE_KEY = "fbpanel:content-flow-onboarding:v1";

export function getHasSeenContentFlowOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CONTENT_FLOW_ONBOARDING_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function setContentFlowOnboardingSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONTENT_FLOW_ONBOARDING_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
