import type { z } from "zod";
import { contentPostSchema } from "@/lib/validations";

export type ContentPostFormValues = z.infer<typeof contentPostSchema>;
