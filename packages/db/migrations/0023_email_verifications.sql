CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"seat_hold_id" uuid NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verifications_attempts_check" CHECK ("email_verifications"."attempts" between 0 and 5),
	CONSTRAINT "email_verifications_consumed_check" CHECK ("email_verifications"."consumed_at" is null or "email_verifications"."verified_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_seat_hold_id_seat_holds_id_fk" FOREIGN KEY ("seat_hold_id") REFERENCES "public"."seat_holds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verifications_seat_hold_id_created_at_idx" ON "email_verifications" USING btree ("seat_hold_id","created_at");