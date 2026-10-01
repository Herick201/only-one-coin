ALTER TABLE "courses" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "certificate_rule" text DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "allows_freeze" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "allows_transfer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_certificate_rule_check" CHECK ("courses"."certificate_rule" in ('automatic', 'exam_required'));
--> statement-breakpoint
-- plan_prices joins the 0011 lock (CLAUDE.md §6, apps/api/CLAUDE.md "preço é
-- versionado, nunca editado"): until now that rule was convention only. Both
-- layers, never one of the two (packages/db/CLAUDE.md).
REVOKE UPDATE, DELETE ON plan_prices FROM ooc_app;
--> statement-breakpoint
DROP TRIGGER IF EXISTS plan_prices_append_only ON plan_prices;
--> statement-breakpoint
CREATE TRIGGER plan_prices_append_only
	BEFORE UPDATE OR DELETE OR TRUNCATE ON plan_prices
	FOR EACH STATEMENT EXECUTE FUNCTION forbid_history_rewrite();
