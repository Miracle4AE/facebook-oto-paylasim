import type { IFacebookPublishService } from "./facebook-publish.service";
import { MockFacebookPublishService } from "./mock-facebook-publish.service";
import { FacebookGraphPublishService } from "./facebook-graph.service";

export function getFacebookPublishService(): IFacebookPublishService {
  if (process.env.FACEBOOK_PUBLISH_MODE === "graph") {
    return new FacebookGraphPublishService();
  }
  return new MockFacebookPublishService();
}
