ALTER TABLE "user_settings" ADD COLUMN "server_url" varchar(500);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "server_verification_token" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "server_token_created_at" timestamp;