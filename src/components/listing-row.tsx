"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Listing } from "@/lib/db/schema";

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
  const price = listing.netEffective ?? listing.price;

  return (
    <>
      <TableRow
        onClick={() => setExpanded(!expanded)}
        className={`cursor-pointer ${isDismissed ? "opacity-40 line-through" : ""}`}
      >
        <TableCell>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline"
          >
            {listing.address}
            {listing.unit ? ` #${listing.unit}` : ""}
          </a>
        </TableCell>
        <TableCell>{listing.neighborhood}</TableCell>
        <TableCell className="font-semibold">
          ${price?.toLocaleString()}
          {listing.netEffective && listing.netEffective !== listing.price && (
            <span className="text-xs text-muted-foreground ml-1">
              (net)
            </span>
          )}
        </TableCell>
        <TableCell>{listing.sqft ?? "—"}</TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {listing.noFee && <Badge variant="destructive">No Fee</Badge>}
            {listing.hasLaundry && <Badge className="bg-green-600">Laundry</Badge>}
            {listing.hasElevator && <Badge variant="secondary">Elevator</Badge>}
            {listing.newDev && <Badge variant="outline">New Dev</Badge>}
          </div>
        </TableCell>
        <TableCell className="font-mono">{listing.score?.toFixed(1)}</TableCell>
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
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/50 p-4">
            <div className="grid gap-2 text-sm">
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
