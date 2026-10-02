DROP INDEX "payment_receipts_operation_number_uidx";--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "receipt_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_receipt_upload_id_receipt_uploads_id_fk" FOREIGN KEY ("receipt_upload_id") REFERENCES "public"."receipt_uploads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_receipts_operation_number_idx" ON "payment_receipts" USING btree ("operation_number") WHERE "payment_receipts"."operation_number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_receipt_upload_tier_uidx" ON "payment_receipts" USING btree ("receipt_upload_id","tier") WHERE "payment_receipts"."receipt_upload_id" is not null;