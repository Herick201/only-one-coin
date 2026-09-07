CREATE TABLE "staff_password_resets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_password_resets_status_check" CHECK ("staff_password_resets"."status" in ('pending', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "staff_password_resets_token_uidx" ON "staff_password_resets" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_password_resets_pending_user_id_uidx" ON "staff_password_resets" USING btree ("user_id") WHERE "staff_password_resets"."status" = 'pending';