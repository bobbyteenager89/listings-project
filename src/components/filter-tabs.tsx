"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Favorites", value: "favorite" },
  { label: "Dismissed", value: "dismissed" },
  { label: "Off Market", value: "off_market" },
  { label: "Buildings", value: "buildings" },
];

const CITY_TABS = [
  { label: "All Cities", value: "" },
  { label: "NYC", value: "nyc" },
  { label: "LA", value: "la" },
];

const TYPE_TABS = [
  { label: "All Types", value: "" },
  { label: "Rentals", value: "rental" },
  { label: "Sublets", value: "sublet" },
];

export function FilterTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";
  const currentCity = searchParams.get("city") ?? "";
  const currentType = searchParams.get("listingType") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setParam("status", tab.value)}
            className={`px-3 py-1.5 rounded-md text-base font-medium transition-colors ${
              currentStatus === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {CITY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setParam("city", tab.value)}
            className={`px-3 py-1.5 rounded-md text-base font-medium transition-colors ${
              currentCity === tab.value
                ? "bg-blue-600 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setParam("listingType", tab.value)}
            className={`px-3 py-1.5 rounded-md text-base font-medium transition-colors ${
              currentType === tab.value
                ? "bg-emerald-600 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
