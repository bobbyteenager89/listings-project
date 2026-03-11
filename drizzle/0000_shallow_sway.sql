CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'streeteasy' NOT NULL,
	"source_id" text,
	"url" text NOT NULL,
	"address" text,
	"unit" text,
	"neighborhood" text,
	"price" integer,
	"net_effective" integer,
	"sqft" integer,
	"no_fee" boolean DEFAULT false,
	"new_dev" boolean DEFAULT false,
	"has_laundry" boolean DEFAULT false,
	"has_elevator" boolean DEFAULT false,
	"photo_count" integer DEFAULT 0,
	"score" real DEFAULT 0,
	"status" text DEFAULT 'new' NOT NULL,
	"missed_scrapes" integer DEFAULT 0,
	"first_seen" timestamp DEFAULT now(),
	"last_checked" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "url_idx" ON "listings" USING btree ("url");