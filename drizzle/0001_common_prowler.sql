CREATE TYPE "public"."ai_hosting" AS ENUM('api', 'self_hosted', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."revenue_model" AS ENUM('free', 'freemium', 'subscription', 'one_time', 'ads', 'service', 'not_yet');--> statement-breakpoint
CREATE TYPE "public"."tag_group" AS ENUM('stack', 'ai_model', 'ai_tech', 'ai_domain');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ai_models" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ai_hosting" "ai_hosting";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "monthly_cost_cny" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "monthly_revenue_cny" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "revenue_model" "revenue_model";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cost_note" varchar(200);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "revenue_note" varchar(200);--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "tag_group" "tag_group" DEFAULT 'stack' NOT NULL;--> statement-breakpoint
CREATE INDEX "projects_ai_idx" ON "projects" USING btree ("is_ai","status","published_at");