"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListingRow } from "./listing-row";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/lib/db/schema";

export function ListingsTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<{ listings: Listing[]; total: number }>({
    listings: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const status = searchParams.get("status") ?? "";
  const city = searchParams.get("city") ?? "";
  const listingType = searchParams.get("listingType") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "score";
  const sortDir = searchParams.get("sortDir") ?? "desc";
  const page = parseInt(searchParams.get("page") ?? "1");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (city) params.set("city", city);
    if (listingType) params.set("listingType", listingType);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(page));

    fetch(`/api/listings?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [status, city, listingType, sortBy, sortDir, page]);

  function toggleSort(column: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === column) {
      params.set("sortDir", sortDir === "desc" ? "asc" : "desc");
    } else {
      params.set("sortBy", column);
      params.set("sortDir", "desc");
    }
    router.push(`/?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/?${params.toString()}`);
  }

  const totalPages = Math.ceil(data.total / 20);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              { label: "Listing", value: "address", sortable: false },
              { label: "Price", value: "price", sortable: true },
              { label: "Sqft", value: "sqft", sortable: true },
              { label: "Added", value: "date", sortable: true },
              { label: "Tags", value: "tags", sortable: false },
              { label: "Score", value: "score", sortable: true },
              { label: "", value: "actions", sortable: false },
            ].map((col) => (
              <TableHead
                key={col.value}
                className={col.sortable ? "cursor-pointer select-none" : ""}
                onClick={() => col.sortable && toggleSort(col.value)}
              >
                {col.label}
                {sortBy === col.value && (
                  <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : data.listings.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No listings found
              </TableCell>
            </TableRow>
          ) : (
            data.listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-base text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
