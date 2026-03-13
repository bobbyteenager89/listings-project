CREATE TABLE "building_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"building_id" integer NOT NULL,
	"unit" text,
	"price" integer,
	"sqft" integer,
	"beds" integer DEFAULT 0,
	"no_fee" boolean DEFAULT false,
	"url" text,
	"available" boolean DEFAULT true,
	"first_seen" timestamp DEFAULT now(),
	"last_seen" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"address" text,
	"neighborhood" text,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"year_built" integer,
	"total_units" integer,
	"studio_count" integer DEFAULT 0,
	"amenities" jsonb DEFAULT '{}'::jsonb,
	"image_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"first_seen" timestamp DEFAULT now(),
	"last_checked" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "building_units" ADD CONSTRAINT "building_units_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "building_unit_idx" ON "building_units" USING btree ("building_id","unit");--> statement-breakpoint
CREATE UNIQUE INDEX "buildings_slug_idx" ON "buildings" USING btree ("slug");