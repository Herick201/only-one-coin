ALTER TABLE "class_groups" ADD COLUMN "slots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "teacher_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_groups" ADD COLUMN "ends_on" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "level" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "modules" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "total_hours" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_modules_check" CHECK ("courses"."modules" > 0);--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_total_hours_check" CHECK ("courses"."total_hours" >= 0);