ALTER TABLE "class_groups" DROP CONSTRAINT "class_groups_status_check";--> statement-breakpoint
DROP INDEX "waitlist_entries_class_group_id_student_id_uidx";--> statement-breakpoint
ALTER TABLE "class_groups" ALTER COLUMN "starts_on" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "class_groups" ALTER COLUMN "ends_on" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "enrollment_opens_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "enrollment_closes_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "source_class_group_id" uuid;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "left_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "left_reason" text;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_source_class_group_id_class_groups_id_fk" FOREIGN KEY ("source_class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_groups_source_class_group_id_idx" ON "class_groups" USING btree ("source_class_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_active_uidx" ON "waitlist_entries" USING btree ("class_group_id","student_id") WHERE "waitlist_entries"."left_at" is null;--> statement-breakpoint
CREATE INDEX "waitlist_entries_class_group_id_created_at_idx" ON "waitlist_entries" USING btree ("class_group_id","created_at");--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_dates_check" CHECK ("class_groups"."status" = 'draft' or ("class_groups"."starts_on" is not null and "class_groups"."ends_on" is not null));--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_enrollment_window_check" CHECK ("class_groups"."enrollment_opens_at" is null or "class_groups"."enrollment_closes_at" is null or "class_groups"."enrollment_opens_at" < "class_groups"."enrollment_closes_at");--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_status_check" CHECK ("class_groups"."status" in ('draft', 'enrolling', 'in_progress', 'finished', 'closed'));--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_left_reason_check" CHECK ("waitlist_entries"."left_reason" is null or "waitlist_entries"."left_reason" in ('enrolled', 'withdrawn', 'removed_by_staff'));--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_left_check" CHECK (("waitlist_entries"."left_at" is null) = ("waitlist_entries"."left_reason" is null));