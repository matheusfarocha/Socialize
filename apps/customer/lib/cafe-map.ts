export type CafeLocation = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  address: string;
  category: "Manhattan" | "Brooklyn";
  borough: "Manhattan" | "Brooklyn";
  neighborhood: string;
  markerLabel: string;
  destinationHref: string;
  isHighlighted?: boolean;
};

export const networkingCafes: CafeLocation[] = [
  {
    id: "nomad-forum-cafe",
    title: "Nomad Forum Cafe",
    latitude: 40.7443,
    longitude: -73.9881,
    address: "28 W 28th St, NoMad",
    category: "Manhattan",
    borough: "Manhattan",
    neighborhood: "NoMad",
    markerLabel: "NoMad",
    destinationHref: "/",
    isHighlighted: true,
  },
  {
    id: "soho-common-house",
    title: "SoHo Common House",
    latitude: 40.7234,
    longitude: -74.002,
    address: "131 Greene St, SoHo",
    category: "Manhattan",
    borough: "Manhattan",
    neighborhood: "SoHo",
    markerLabel: "SoHo",
    destinationHref: "/",
  },
  {
    id: "west-village-roast",
    title: "West Village Roast",
    latitude: 40.7345,
    longitude: -74.0027,
    address: "299 Bleecker St, West Village",
    category: "Manhattan",
    borough: "Manhattan",
    neighborhood: "West Village",
    markerLabel: "Village",
    destinationHref: "/",
  },
  {
    id: "williamsburg-junction",
    title: "Williamsburg Junction",
    latitude: 40.7182,
    longitude: -73.9588,
    address: "214 Bedford Ave, Williamsburg",
    category: "Brooklyn",
    borough: "Brooklyn",
    neighborhood: "Williamsburg",
    markerLabel: "WBurg",
    destinationHref: "/",
  },
  {
    id: "dumbo-signal-house",
    title: "DUMBO Signal House",
    latitude: 40.7034,
    longitude: -73.9891,
    address: "55 Water St, DUMBO",
    category: "Brooklyn",
    borough: "Brooklyn",
    neighborhood: "DUMBO",
    markerLabel: "DUMBO",
    destinationHref: "/",
  },
  {
    id: "greenpoint-ledger",
    title: "Greenpoint Ledger",
    latitude: 40.7296,
    longitude: -73.9545,
    address: "102 Franklin St, Greenpoint",
    category: "Brooklyn",
    borough: "Brooklyn",
    neighborhood: "Greenpoint",
    markerLabel: "Greenpt",
    destinationHref: "/",
  },
];

export function buildCafeDirectionsHref(cafe: Pick<CafeLocation, "latitude" | "longitude">) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${cafe.latitude},${cafe.longitude}`,
  )}`;
}
