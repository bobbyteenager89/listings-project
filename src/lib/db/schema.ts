import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull().default("streeteasy"),
    sourceId: text("source_id"),
    url: text("url").notNull(),
    address: text("address"),
    unit: text("unit"),
    neighborhood: text("neighborhood"),
    city: text("city").default("nyc"),
    listingType: text("listing_type").default("rental"),
    price: integer("price"),
    netEffective: integer("net_effective"),
    sqft: integer("sqft"),
    noFee: boolean("no_fee").default(false),
    newDev: boolean("new_dev").default(false),
    hasLaundry: boolean("has_laundry").default(false),
    hasElevator: boolean("has_elevator").default(false),
    photoCount: integer("photo_count").default(0),
    imageUrl: text("image_url"),
    availableDate: text("available_date"),
    endDate: text("end_date"),
    score: real("score").default(0),
    status: text("status").notNull().default("new"),
    missedScrapes: integer("missed_scrapes").default(0),
    firstSeen: timestamp("first_seen").defaultNow(),
    lastChecked: timestamp("last_checked").defaultNow(),
    notes: text("notes"),
  },
  (table) => [uniqueIndex("url_idx").on(table.url)]
);

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
