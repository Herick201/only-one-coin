CREATE TABLE "portal_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_access_tokens_purpose_check" CHECK ("portal_access_tokens"."purpose" in ('activation', 'reset'))
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_access_tokens_token_hash_uidx" ON "portal_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_access_tokens_user_id_created_at_idx" ON "portal_access_tokens" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "students_user_id_idx" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "students_portal_national_id_idx" ON "students" USING btree ("national_id_type",regexp_replace(upper("national_id"), '[[:space:].-]', '', 'g')) WHERE "students"."user_id" is not null;--> statement-breakpoint
-- Better Auth's "user" is not in the Drizzle schema (0001), so these two are
-- written by hand. A file keeps pointing at its account: restrict, never
-- cascade (students are never deleted, CLAUDE.md §6). A link dies with its
-- account.
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "portal_access_tokens" ADD CONSTRAINT "portal_access_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade;