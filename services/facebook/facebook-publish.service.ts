import type { FacebookPublishContext, FacebookPublishPayload, FacebookPublishResult } from "./facebook-publish.types";

export interface IFacebookPublishService {
  publish(
    ctx: FacebookPublishContext,
    payload: FacebookPublishPayload,
  ): Promise<FacebookPublishResult>;
}
