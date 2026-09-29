CREATE TABLE "platform_settings" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"checkout_hold_minutes" integer DEFAULT 15 NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_singleton_check" CHECK ("platform_settings"."id"),
	CONSTRAINT "platform_settings_checkout_hold_minutes_check" CHECK ("platform_settings"."checkout_hold_minutes" between 5 and 60)
);
--> statement-breakpoint
CREATE TABLE "seat_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_group_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"enrollment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seat_holds_origin_check" CHECK ("seat_holds"."origin" in ('whatsapp', 'web')),
	CONSTRAINT "seat_holds_status_check" CHECK ("seat_holds"."status" in ('active', 'consumed', 'released', 'expired')),
	CONSTRAINT "seat_holds_enrollment_check" CHECK (("seat_holds"."status" = 'consumed') = ("seat_holds"."enrollment_id" is not null)),
	CONSTRAINT "seat_holds_settled_check" CHECK (("seat_holds"."status" = 'active') = ("seat_holds"."settled_at" is null))
);
--> statement-breakpoint
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seat_holds_active_expires_at_idx" ON "seat_holds" USING btree ("expires_at") WHERE "seat_holds"."status" = 'active';--> statement-breakpoint
CREATE INDEX "seat_holds_class_group_id_idx" ON "seat_holds" USING btree ("class_group_id");--> statement-breakpoint
-- The one row platform_settings ever holds, born with the defaults the
-- checkout already ran on (15-minute hold, apps/api/CLAUDE.md "Dois relógios").
INSERT INTO "platform_settings" ("id") VALUES (true) ON CONFLICT DO NOTHING;
