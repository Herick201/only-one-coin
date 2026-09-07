-- Better Auth "admin" plugin schema (docs at better-auth/dist/plugins/admin) —
-- hand-added ahead of the two generated CREATE TABLEs below, same reasoning as
-- 0001_better_auth_core.sql: these columns extend Better Auth's own hand-rolled
-- "user"/"session" tables, which aren't modeled in packages/db/src/schema.ts, so
-- drizzle-kit generate never sees them. Enabling the plugin (apps/api/src/infra/
-- auth/betterAuth.ts) is what makes "banned" actually block sign-in — this
-- migration only adds the columns it expects to find.
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN "banReason" text;
ALTER TABLE "user" ADD COLUMN "banExpires" timestamptz;
ALTER TABLE "session" ADD COLUMN "impersonatedBy" text;
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_invites" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by" text NOT NULL,
	"completed_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_invites_role_check" CHECK ("staff_invites"."role" in ('admin', 'coordinator', 'treasury', 'mass_approver', 'teacher')),
	CONSTRAINT "staff_invites_status_check" CHECK ("staff_invites"."status" in ('pending', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX "audit_log_target_id_idx" ON "audit_log" USING btree ("target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_invites_token_uidx" ON "staff_invites" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_invites_pending_email_uidx" ON "staff_invites" USING btree ("email") WHERE "staff_invites"."status" = 'pending';