import { Suspense } from "react";
import { StatsBar } from "@/components/stats-bar";
import { FilterTabs } from "@/components/filter-tabs";
import { ListingsTable } from "@/components/listings-table";

export default function Dashboard() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Listings</h1>
          <p className="text-muted-foreground text-sm">
            NYC & LA · Rentals & Sublets
          </p>
        </div>
        <a
          href="/scrape"
          className="text-sm text-blue-600 hover:underline"
        >
          Scrape →
        </a>
      </div>

      <Suspense fallback={<div className="text-muted-foreground">Loading stats...</div>}>
        <StatsBar />
      </Suspense>

      <Suspense fallback={null}>
        <FilterTabs />
      </Suspense>

      <Suspense fallback={<div className="text-muted-foreground">Loading listings...</div>}>
        <ListingsTable />
      </Suspense>
    </main>
  );
}
