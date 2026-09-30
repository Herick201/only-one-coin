DROP INDEX "payment_receipts_image_phash_uidx";--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "image_sha256" text;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "image_phash" bigint;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "image_phash_crops" bigint[];--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "exif_facts" jsonb;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "fraud_signals" jsonb;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "screened_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "payment_receipts_image_phash_idx" ON "payment_receipts" USING btree ("image_phash") WHERE "payment_receipts"."image_phash" is not null;--> statement-breakpoint
CREATE INDEX "payments_method_operation_key_idx" ON "payments" USING btree ("method",upper(regexp_replace("operation_number", '[^A-Za-z0-9]', '', 'g'))) WHERE "payments"."operation_number" is not null;--> statement-breakpoint
CREATE INDEX "receipt_uploads_screen_pending_idx" ON "receipt_uploads" USING btree ("created_at") WHERE "receipt_uploads"."status" = 'processed' and "receipt_uploads"."payment_id" is not null and "receipt_uploads"."screened_at" is null;--> statement-breakpoint
CREATE INDEX "receipt_uploads_image_sha256_idx" ON "receipt_uploads" USING btree ("image_sha256") WHERE "receipt_uploads"."image_sha256" is not null;