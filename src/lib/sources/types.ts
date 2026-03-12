export interface NormalizedListing {
  source: string;
  sourceId: string;
  url: string;
  address: string;
  unit: string | null;
  neighborhood: string;
  city: string;
  listingType: string;
  price: number;
  netEffective: number | null;
  sqft: number | null;
  noFee: boolean;
  newDev: boolean;
  hasLaundry: boolean;
  hasElevator: boolean;
  photoCount: number;
  imageUrl: string | null;
  availableDate: string | null;
  endDate: string | null;
}
