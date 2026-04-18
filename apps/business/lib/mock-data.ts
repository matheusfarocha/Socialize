import { TrendingUp, Users, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Dashboard ──────────────────────────────────────────────

export interface TopSeller {
  name: string;
  orders: number;
  revenue: string;
}

export const topSellers: TopSeller[] = [
  { name: "Oat Milk Latte", orders: 124, revenue: "$682" },
  { name: "Ethiopia Pour Over", orders: 98, revenue: "$539" },
  { name: "Avo Toast", orders: 85, revenue: "$765" },
];

export interface ChartDataPoint {
  day: string;
  current: number;
  previous: number;
}

export const chartData: ChartDataPoint[] = [
  { day: "Mon", current: 80, previous: 60 },
  { day: "Tue", current: 60, previous: 40 },
  { day: "Wed", current: 90, previous: 70 },
  { day: "Thu", current: 40, previous: 50 },
  { day: "Fri", current: 70, previous: 85 },
  { day: "Sat", current: 85, previous: 65 },
  { day: "Sun", current: 100, previous: 95 },
];

export const revenueMiniBarHeights = [40, 60, 50, 80, 95, 30];

// ── Insights ───────────────────────────────────────────────

export interface Insight {
  tag: string;
  tagIcon: LucideIcon;
  tagColor: string;
  title: string;
  description: string;
  cta: string;
}

export const insights: Insight[] = [
  {
    tag: "Thursday Afternoons",
    tagIcon: TrendingUp,
    tagColor: "bg-primary-container/20 text-primary-container",
    title: 'The 3 PM Rush is getting stronger.',
    description:
      "We noticed a 25% uptick in espresso-based drinks between 3 PM and 5 PM over the last three Thursdays. It looks like the local office crowd is making us their go-to spot for an afternoon pick-me-up.",
    cta: "Review Staffing for Thursdays",
  },
  {
    tag: "Customer Persona",
    tagIcon: Users,
    tagColor: "bg-tertiary-container/20 text-tertiary",
    title: 'The "Writers" are settling in.',
    description:
      "Table turnover in the back nook has slowed significantly in the mornings. Wi-Fi usage indicates lots of long-session laptop users. They love the quiet vibe, but they're mostly ordering single drips.",
    cta: 'Consider a "Bottomless Mug" promo',
  },
];

export interface InventoryInsight {
  tag: string;
  tagIcon: LucideIcon;
  tagColor: string;
  title: string;
  description: string;
  cta: string;
  stats: { icon: LucideIcon; iconClass: string; value: string; label: string; dimmed?: boolean }[];
}

export const inventoryInsight: InventoryInsight = {
  tag: "Inventory Check",
  tagIcon: Package,
  tagColor: "bg-secondary-container/50 text-secondary",
  title: "Oat milk is outpacing Almond.",
  description:
    "It finally happened. For the first time this quarter, Oat milk requests have surpassed Almond milk by a wide margin. We might run low before the weekend delivery.",
  cta: "Adjust Next Order",
  stats: [], // stats are rendered inline on the insights page with their icons
};

// ── Floor Plan ─────────────────────────────────────────────

export const zones = ["Main Floor", "Patio", "Private Room"];

export interface PaletteTable {
  label: string;
  detail: string;
  shape: string;
}

export const paletteTables: PaletteTable[] = [
  { label: "Round Table", detail: "(2 seats)", shape: "round" },
  { label: "Square Table", detail: "(2 seats)", shape: "square" },
  { label: "Long Table", detail: "(4 seats)", shape: "long" },
  { label: "Booth", detail: "(Corner)", shape: "booth" },
];

export interface PaletteStructural {
  label: string;
  type: string;
}

export const paletteStructural: PaletteStructural[] = [
  { label: "Wall Divider", type: "wall" },
  { label: "Entrance", type: "entrance" },
  { label: "Bar/Counter", type: "bar" },
];

// ── Menu ───────────────────────────────────────────────────

export const menuCategories = ["Hot Beverages", "Cold Drinks", "Pastries", "Sandwiches"];

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  active: boolean;
}

export const menuItems: MenuItem[] = [
  {
    name: "Pour Over Coffee",
    description: "Single-origin beans, hand-poured.",
    price: "4.50",
    active: true,
  },
  {
    name: "Classic Espresso",
    description: "Double shot of our house blend.",
    price: "3.25",
    active: true,
  },
  {
    name: "Matcha Latte",
    description: "Ceremonial grade matcha with steamed oat milk.",
    price: "5.50",
    active: false,
  },
];
