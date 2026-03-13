"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Listing } from "@/lib/db/schema";

function daysAgo(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function ListingRow({ listing }: { listing: Listing }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(listing.status);
  const [notes, setNotes] = useState(listing.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
  }

  const isDismissed = status === "dismissed";
  const isOffMarket = status === "off_market";
  const price = listing.netEffective ?? listing.price;
  const days = daysAgo(listing.firstSeen);
  const isStale = days !== null && days > 30 && !listing.newDev;

  return (
    <>
      <TableRow
        onClick={() => setExpanded(!expanded)}
        className={`cursor-pointer ${isDismissed ? "opacity-40" : ""} ${isOffMarket ? "opacity-50 line-through" : ""} ${isStale ? "bg-amber-50/50" : ""}`}
      >
        <TableCell>
          <div className="flex items-center gap-3">
            {listing.imageUrl ? (
              <img
                src={listing.imageUrl}
                alt=""
                className="w-16 h-12 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-12 bg-zinc-100 rounded flex-shrink-0 flex items-center justify-center text-zinc-400 text-xs">
                No img
              </div>
            )}
            <div className="min-w-0">
              <a
                href={listing.url}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline font-medium truncate block text-base"
              >
                {listing.address}
                {listing.unit ? ` ${listing.unit}` : ""}
              </a>
              <div className="text-sm text-muted-foreground">
                {listing.neighborhood}
                {listing.city === "la" ? " · LA" : ""}
                {listing.listingType === "sublet" && " · sublet"}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="font-semibold text-base">
          ${price?.toLocaleString()}
          {listing.netEffective && listing.netEffective !== listing.price && (
            <span className="text-sm text-muted-foreground ml-1">(net)</span>
          )}
        </TableCell>
        <TableCell className="text-base">{listing.sqft ?? "—"}</TableCell>
        <TableCell>
          <span className={`text-base ${isStale ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
            {days !== null ? (days === 0 ? "today" : days === 1 ? "1d" : `${days}d`) : "—"}
          </span>
          {isStale && <span className="text-sm text-amber-500 ml-1">stale</span>}
        </TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {listing.noFee && <Badge variant="destructive">No Fee</Badge>}
            {listing.hasLaundry && <Badge className="bg-green-600">Laundry</Badge>}
            {listing.hasElevator && <Badge variant="secondary">Elevator</Badge>}
            {listing.newDev && <Badge variant="outline">New Dev</Badge>}
          </div>
        </TableCell>
        <TableCell className="font-mono text-xl">{listing.score != null ? listing.score.toFixed(0) : "—"}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={status === "favorite" ? "default" : "ghost"}
              onClick={() =>
                updateStatus(status === "favorite" ? "active" : "favorite")
              }
              disabled={saving}
            >
              ★
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateStatus(status === "dismissed" ? "active" : "dismissed")
              }
              disabled={saving}
            >
              ✕
            </Button>
            <Button
              size="sm"
              variant={isOffMarket ? "default" : "ghost"}
              onClick={() =>
                updateStatus(isOffMarket ? "active" : "off_market")
              }
              disabled={saving}
              title="Mark off market"
            >
              ⊘
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/50 p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex gap-4">
                <div>
                  <strong>First seen:</strong>{" "}
                  {listing.firstSeen
                    ? new Date(listing.firstSeen).toLocaleDateString()
                    : "—"}
                </div>
                <div>
                  <strong>Photos:</strong> {listing.photoCount ?? 0}
                </div>
                <div>
                  <strong>Source:</strong> {listing.source}
                </div>
                {listing.availableDate && (
                  <div>
                    <strong>Available:</strong> {listing.availableDate}
                    {listing.endDate && ` – ${listing.endDate}`}
                  </div>
                )}
              </div>
              <div>
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline text-xs"
                >
                  View on {listing.source === "streeteasy" ? "StreetEasy" : "Listings Project"} →
                </a>
              </div>
              <div>
                <label className="font-semibold block mb-1">Notes:</label>
                <textarea
                  className="w-full p-2 rounded border bg-background text-sm min-h-[60px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Add personal notes..."
                />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
