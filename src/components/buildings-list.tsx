"use client";

import { useEffect, useState } from "react";
import { BuildingCard } from "./building-card";
import type { Building, BuildingUnit } from "@/lib/db/schema";

type BuildingWithUnits = Building & { units: BuildingUnit[] };

export function BuildingsList() {
  const [buildings, setBuildings] = useState<BuildingWithUnits[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/buildings")
      .then((r) => r.json())
      .then((d) => {
        setBuildings(d.buildings);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-muted-foreground text-base">Loading buildings...</div>;
  }

  if (buildings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-base">
        No buildings yet. Use the <a href="/scrape" className="text-blue-600 hover:underline">scrape page</a> to add buildings.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {buildings.map((building) => (
        <BuildingCard key={building.id} building={building} />
      ))}
    </div>
  );
}
