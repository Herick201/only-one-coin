import { CertificateRuleSchema } from "@ooc/domain";
import { z } from "zod";

export const IdParamsSchema = z.object({ id: z.string().uuid() });

/** Every catalog write answers the id it touched; the screen re-reads. */
export const IdResponseSchema = z.object({ id: z.string().uuid() });

export const CourseListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  language: z.string(),
  level: z.string(),
  summary: z.string(),
  minAge: z.number().int(),
  modules: z.number().int(),
  totalHours: z.number().int(),
  certificateRule: CertificateRuleSchema,
  allowsFreeze: z.boolean(),
  allowsTransfer: z.boolean(),
  active: z.boolean(),
  classGroupCount: z.number().int(),
});

export const PlanDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  active: z.boolean(),
  currentPriceId: z.string().uuid().nullable(),
  prices: z.array(
    z.object({
      id: z.string().uuid(),
      amountCents: z.number().int(),
      validFrom: z.string().datetime(),
      createdAt: z.string().datetime(),
    }),
  ),
});

/** A price as the screen sends it — whole cents, and an optional start. */
export const PriceBodySchema = z.object({
  amountCents: z.number().int().positive(),
  validFrom: z.string().datetime({ offset: true }).optional(),
});
