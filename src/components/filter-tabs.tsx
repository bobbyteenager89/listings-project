"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Favorites", value: "favorite" },
  { label: "Dismissed", value: "dismissed" },
];

export function FilterTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";

  function handleTabClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleTabClick(tab.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentStatus === tab.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
