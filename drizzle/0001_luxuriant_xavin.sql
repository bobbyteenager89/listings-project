ALTER TABLE "listings" ADD COLUMN "city" text DEFAULT 'nyc';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "listing_type" text DEFAULT 'rental';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "available_date" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "end_date" text;