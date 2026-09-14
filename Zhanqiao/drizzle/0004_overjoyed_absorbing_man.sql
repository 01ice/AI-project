CREATE TYPE "public"."email_code_purpose" AS ENUM('register', 'reset_password');--> statement-breakpoint
CREATE TABLE "email_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"purpose" "email_code_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_codes_lookup_idx" ON "email_codes" USING btree ("email","purpose","created_at");