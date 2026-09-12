ALTER TYPE "public"."post_status" ADD VALUE 'pending' BEFORE 'published';--> statement-breakpoint
ALTER TYPE "public"."post_status" ADD VALUE 'rejected';--> statement-breakpoint
ALTER TYPE "public"."post_status" ADD VALUE 'offline';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "moderation_source" "moderation_source";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "moderation_note" varchar(500);