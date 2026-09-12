ALTER TABLE "users" ADD COLUMN "email_verify_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expires_at" timestamp with time zone;