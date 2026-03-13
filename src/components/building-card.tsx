"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Building, BuildingUnit } from "@/lib/db/schema";

type BuildingWithUnits = Building & { units: BuildingUnit[] };

const AMENITY_COLORS: Record<string, string> = {
  doorman: "bg-blue-100 text-blue-800",
  gym: "bg-green-100 text-green-800",
  roof: "bg-amber-100 text-amber-800",
  laundry: "bg-purple-100 text-purple-800",
  pool: "bg-cyan-100 text-cyan-800",
  parking: "bg-slate-100 text-slate-800",
  elevator: "bg-gray-100 text-gray-800",
  bikeRoom: "bg-orange-100 text-orange-800",
  storage: "bg-stone-100 text-stone-800",
  concierge: "bg-indigo-100 text-indigo-800",
};

const AMENITY_LABELS: Record<string, string> = {
  doorman: "Doorman",
  gym: "Gym",
  roof: "Roof",
  laundry: "Laundry",
  pool: "Pool",
  parking: "Parking",
  elevator: "Elevator",
  bikeRoom: "Bike Room",
  storage: "Storage",
  concierge: "Concierge",
};

export function BuildingCard({ building }: { building: BuildingWithUnits }) {
  const [expanded, setExpanded] = useState(false);
  const amenities = (building.amenities ?? {}) as Record<string, boolean>;
  const activeAmenities = Object.entries(amenities).filter(([, v]) => v);

  return (
    <div className="border rounded-xl p-5 hover:border-zinc-300 transition-colors">
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold">{building.name || building.address}</h3>
            <p className="text-base text-muted-foreground">
              {building.address}
              {building.neighborhood ? ` · ${building.neighborhood}` : ""}
              {building.yearBuilt ? ` · Built ${building.yearBuilt}` : ""}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {activeAmenities.map(([key]) => (
              <span
                key={key}
                className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${AMENITY_COLORS[key] ?? "bg-gray-100 text-gray-800"}`}
              >
                {AMENITY_LABELS[key] ?? key}
              </span>
            ))}
          </div>
        </div>
        <p className="text-base text-muted-foreground">
          {building.units.length} studio{building.units.length !== 1 ? "s" : ""} available
          {building.totalUnits ? ` · ${building.totalUnits} total units` : ""}
          <span className="ml-2">{expanded ? "▾" : "▸"}</span>
        </p>
      </div>

      {expanded && building.units.length > 0 && (
        <div className="mt-4 bg-muted/50 rounded-lg p-3">
          {building.units.map((unit) => (
            <div
              key={unit.id}
              className="flex justify-between items-center py-2 border-b last:border-0 text-base"
            >
              <span className="font-medium">{unit.unit || "Studio"}</span>
              <span className="text-muted-foreground">{unit.sqft ? `${unit.sqft} sqft` : "—"}</span>
              <span className="font-semibold">${unit.price?.toLocaleString()}/mo</span>
              {unit.noFee && <Badge variant="destructive" className="text-xs">No Fee</Badge>}
              {unit.url && (
                <a
                  href={unit.url}
                  target="_blank"
                  rel="noopener"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 hover:underline text-sm"
                >
                  SE →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && building.units.length === 0 && (
        <p className="mt-4 text-base text-muted-foreground italic">
          No studio units scraped yet.{" "}
          <a href={building.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
            View on StreetEasy →
          </a>
        </p>
      )}
    </div>
  );
}
