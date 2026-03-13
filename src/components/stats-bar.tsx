import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function StatsBar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [stats] = await db
    .select({
      total: sql<number>`count(*) filter (where ${listings.status} != 'off_market' and ${listings.status} != 'dismissed')`,
      newToday: sql<number>`count(*) filter (where ${listings.firstSeen} >= ${today})`,
      favorites: sql<number>`count(*) filter (where ${listings.status} = 'favorite')`,
      lastScraped: sql<Date>`max(${listings.lastChecked})`,
    })
    .from(listings);

  const lastScrapedText = stats.lastScraped
    ? formatRelativeTime(stats.lastScraped)
    : "Never";

  return (
    <div className="flex items-center gap-6 text-base text-muted-foreground border-b pb-3 mb-4">
      <span>
        <strong className="text-foreground">{stats.total}</strong> active
      </span>
      <span>
        <strong className="text-foreground">{stats.newToday}</strong> new today
      </span>
      <span>
        <strong className="text-foreground">{stats.favorites}</strong> favorites
      </span>
      <span>Last scraped: {lastScrapedText}</span>
    </div>
  );
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
