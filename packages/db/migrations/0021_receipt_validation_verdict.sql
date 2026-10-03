ALTER TABLE "receipt_uploads" ADD COLUMN "validation_verdict" text;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "validation_detail" jsonb;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD COLUMN "validated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "receipt_uploads_validate_pending_idx" ON "receipt_uploads" USING btree ("created_at") WHERE "receipt_uploads"."payment_id" is not null and "receipt_uploads"."screened_at" is not null and "receipt_uploads"."validated_at" is null;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD CONSTRAINT "receipt_uploads_validation_verdict_check" CHECK ("receipt_uploads"."validation_verdict" is null or "receipt_uploads"."validation_verdict" in ('approve', 'review', 'reject_suggested'));--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD CONSTRAINT "receipt_uploads_validation_stamp_check" CHECK (("receipt_uploads"."validation_verdict" is null) = ("receipt_uploads"."validated_at" is null));