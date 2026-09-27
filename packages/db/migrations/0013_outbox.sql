CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"template_key" text NOT NULL,
	"recipient" text NOT NULL,
	"locale" text NOT NULL,
	"vars" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_channel_check" CHECK ("outbox"."channel" in ('email')),
	CONSTRAINT "outbox_locale_check" CHECK ("outbox"."locale" in ('es-PE', 'pt-BR', 'en')),
	CONSTRAINT "outbox_status_check" CHECK ("outbox"."status" in ('pending', 'sent', 'blocked', 'failed')),
	CONSTRAINT "outbox_attempts_check" CHECK ("outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dedupe_key_uidx" ON "outbox" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "outbox_pending_created_at_idx" ON "outbox" USING btree ("created_at") WHERE "outbox"."status" = 'pending';