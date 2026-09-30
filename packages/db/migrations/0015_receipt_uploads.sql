CREATE TABLE "receipt_uploads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"seat_hold_id" uuid NOT NULL,
	"payment_id" uuid,
	"object_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"content_type" text,
	"byte_size" integer,
	"processed_object_key" text,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_uploads_status_check" CHECK ("receipt_uploads"."status" in ('pending', 'uploaded', 'processed', 'rejected')),
	CONSTRAINT "receipt_uploads_processed_check" CHECK (("receipt_uploads"."status" = 'processed') = ("receipt_uploads"."processed_object_key" is not null))
);
--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD CONSTRAINT "receipt_uploads_seat_hold_id_seat_holds_id_fk" FOREIGN KEY ("seat_hold_id") REFERENCES "public"."seat_holds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_uploads" ADD CONSTRAINT "receipt_uploads_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_uploads_object_key_uidx" ON "receipt_uploads" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "receipt_uploads_seat_hold_id_idx" ON "receipt_uploads" USING btree ("seat_hold_id");--> statement-breakpoint
CREATE INDEX "receipt_uploads_uploaded_idx" ON "receipt_uploads" USING btree ("created_at") WHERE "receipt_uploads"."status" = 'uploaded';