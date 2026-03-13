import { Suspense } from "react";
import { StatsBar } from "@/components/stats-bar";
import { FilterTabs } from "@/components/filter-tabs";
import { ListingsTable } from "@/components/listings-table";
import { BuildingsList } from "@/components/buildings-list";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const isBuildings = params.status === "buildings";

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Listings</h1>
          <p className="text-muted-foreground text-base">
            NYC & LA · Rentals & Sublets
          </p>
        </div>
        <a
          href="/scrape"
          className="text-base text-blue-600 hover:underline"
        >
          Scrape →
        </a>
      </div>

      {!isBuildings && (
        <Suspense fallback={<div className="text-muted-foreground">Loading stats...</div>}>
          <StatsBar />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <FilterTabs />
      </Suspense>

      {isBuildings ? (
        <Suspense fallback={<div className="text-muted-foreground">Loading buildings...</div>}>
          <BuildingsList />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="text-muted-foreground">Loading listings...</div>}>
          <ListingsTable />
        </Suspense>
      )}
    </main>
  );
}
