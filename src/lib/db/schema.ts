import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  uniqueIndex,
  jsonb,
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

export const buildings = pgTable(
  "buildings",
  {
    id: serial("id").primaryKey(),
    name: text("name"),
    address: text("address"),
    neighborhood: text("neighborhood"),
    slug: text("slug").notNull(),
    url: text("url").notNull(),
    yearBuilt: integer("year_built"),
    totalUnits: integer("total_units"),
    studioCount: integer("studio_count").default(0),
    amenities: jsonb("amenities").$type<Record<string, boolean>>().default({}),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("active"),
    firstSeen: timestamp("first_seen").defaultNow(),
    lastChecked: timestamp("last_checked").defaultNow(),
  },
  (table) => [uniqueIndex("buildings_slug_idx").on(table.slug)]
);

export type Building = typeof buildings.$inferSelect;
export type NewBuilding = typeof buildings.$inferInsert;

export const buildingUnits = pgTable(
  "building_units",
  {
    id: serial("id").primaryKey(),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    unit: text("unit"),
    price: integer("price"),
    sqft: integer("sqft"),
    beds: integer("beds").default(0),
    noFee: boolean("no_fee").default(false),
    url: text("url"),
    available: boolean("available").default(true),
    firstSeen: timestamp("first_seen").defaultNow(),
    lastSeen: timestamp("last_seen").defaultNow(),
  },
  (table) => [uniqueIndex("building_unit_idx").on(table.buildingId, table.unit)]
);

export type BuildingUnit = typeof buildingUnits.$inferSelect;
