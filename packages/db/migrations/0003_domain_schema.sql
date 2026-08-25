CREATE TABLE "academic_periods" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"starts_on" timestamp with time zone NOT NULL,
	"ends_on" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"course_id" uuid NOT NULL,
	"academic_period_id" uuid NOT NULL,
	"schedule" text NOT NULL,
	"starts_on" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"seats_taken" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'enrolling' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_groups_capacity_check" CHECK ("class_groups"."capacity" > 0),
	CONSTRAINT "class_groups_seats_taken_check" CHECK ("class_groups"."seats_taken" >= 0 and "class_groups"."seats_taken" <= "class_groups"."capacity"),
	CONSTRAINT "class_groups_status_check" CHECK ("class_groups"."status" in ('enrolling', 'in_progress', 'finished', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"min_age" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_min_age_check" CHECK ("courses"."min_age" > 0)
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_group_id" uuid NOT NULL,
	"plan_price_id" uuid NOT NULL,
	"seat_status" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_seat_status_check" CHECK ("seat_status" in ('reserved', 'confirmed', 'released'))
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"student_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"relationship" text NOT NULL,
	"national_id_type" text NOT NULL,
	"national_id" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "guardians_relationship_check" CHECK ("relationship" in ('mother', 'father', 'legal_guardian')),
	CONSTRAINT "guardians_national_id_type_check" CHECK ("national_id_type" in ('DNI', 'CE', 'passport'))
);
--> statement-breakpoint
CREATE TABLE "payment_receipts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"payment_id" uuid NOT NULL,
	"image_phash" text,
	"operation_number" text,
	"amount_cents" integer,
	"tier" integer,
	"model_name" text,
	"model_version" text,
	"extracted_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"method" text NOT NULL,
	"method_detail" text,
	"amount_cents" integer NOT NULL,
	"operation_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_status_check" CHECK ("status" in ('pending', 'under_review', 'approved', 'rejected')),
	CONSTRAINT "payments_method_check" CHECK ("method" in ('yape', 'plin', 'bcp', 'interbank', 'other')),
	CONSTRAINT "payments_amount_cents_check" CHECK ("payments"."amount_cents" > 0),
	CONSTRAINT "payments_method_detail_required_check" CHECK ("method" <> 'other' or "method_detail" is not null)
);
--> statement-breakpoint
CREATE TABLE "plan_prices" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"plan_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_prices_amount_cents_check" CHECK ("plan_prices"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"national_id_type" text NOT NULL,
	"national_id" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"birth_date" timestamp with time zone NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"city" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "students_national_id_type_check" CHECK ("national_id_type" in ('DNI', 'CE', 'passport'))
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"class_group_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_academic_period_id_academic_periods_id_fk" FOREIGN KEY ("academic_period_id") REFERENCES "public"."academic_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_plan_price_id_plan_prices_id_fk" FOREIGN KEY ("plan_price_id") REFERENCES "public"."plan_prices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_groups_course_id_idx" ON "class_groups" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "class_groups_academic_period_id_idx" ON "class_groups" USING btree ("academic_period_id");--> statement-breakpoint
CREATE INDEX "consents_guardian_id_accepted_at_idx" ON "consents" USING btree ("guardian_id","accepted_at");--> statement-breakpoint
CREATE INDEX "enrollments_student_id_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_group_id_idx" ON "enrollments" USING btree ("class_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_image_phash_uidx" ON "payment_receipts" USING btree ("image_phash") WHERE "payment_receipts"."image_phash" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_operation_number_uidx" ON "payment_receipts" USING btree ("operation_number") WHERE "payment_receipts"."operation_number" is not null;--> statement-breakpoint
CREATE INDEX "payment_receipts_payment_id_idx" ON "payment_receipts" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key_uidx" ON "payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payments_enrollment_id_idx" ON "payments" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "plan_prices_plan_id_valid_from_idx" ON "plan_prices" USING btree ("plan_id","valid_from");--> statement-breakpoint
CREATE INDEX "plans_course_id_idx" ON "plans" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "students_national_id_type_national_id_idx" ON "students" USING btree ("national_id_type","national_id");--> statement-breakpoint
CREATE INDEX "students_full_name_trgm_idx" ON "students" USING gin (("first_name" || ' ' || "last_name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "students_national_id_trgm_idx" ON "students" USING gin ("national_id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "students_phone_trgm_idx" ON "students" USING gin ("phone" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_class_group_id_student_id_uidx" ON "waitlist_entries" USING btree ("class_group_id","student_id");