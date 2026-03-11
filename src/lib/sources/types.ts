export interface NormalizedListing {
  source: string;
  sourceId: string;
  url: string;
  address: string;
  unit: string | null;
  neighborhood: string;
  price: number;
  netEffective: number | null;
  sqft: number | null;
  noFee: boolean;
  newDev: boolean;
  hasLaundry: boolean;
  hasElevator: boolean;
  photoCount: number;
}

export interface ListingSource {
  name: string;
  fetchListings(): Promise<NormalizedListing[]>;
}
