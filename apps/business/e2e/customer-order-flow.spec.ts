import { expect, test } from "@playwright/test";
import {
  cleanupMenuArtifacts,
  createDemoClient,
  getDemoVenue,
  seedMenuCategoryWithItem,
} from "./helpers/supabase-menu";

test.describe("customer ordering flow", () => {
  test("adds an item to cart and submits a pickup order", async ({ page }) => {
    const marker = `pw-customer-order-${Date.now()}`;
    const categoryName = `${marker} Specials`;
    const itemName = `${marker} Latte`;

    const client = await createDemoClient();
    const venue = await getDemoVenue(client);
    await cleanupMenuArtifacts(client, venue.id, marker);
    await seedMenuCategoryWithItem(client, venue.id, {
      categoryName,
      itemName,
      description: `${marker} oat milk special`,
      price: 7.5,
      isActive: true,
    });

    try {
      const { data: itemRow, error: itemError } = await client
        .from("menu_items")
        .select("id")
        .eq("name", itemName)
        .limit(1)
        .single();

      expect(itemError?.message ?? null).toBeNull();
      expect(itemRow?.id).toBeTruthy();

      await page.goto(`http://127.0.0.1:3000/v/${venue.slug}`);
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();

      await expect(page.getByText(venue.name)).toBeVisible();
      await expect(page.getByText(itemName)).toBeVisible();

      await page.getByTestId(`add-item-${itemRow!.id}`).click();
      await expect(page.getByTestId(`cart-item-${itemRow!.id}`)).toBeVisible();

      await page.getByTestId("checkout-name").fill("Jordan Guest");
      await page.getByTestId("checkout-email").fill("jordan@example.com");
      await page.getByTestId("cardholder-name").fill("Jordan Guest");
      await page.getByTestId("card-last-four").fill("4242");
      await page.getByTestId("submit-order-button").click();

      await expect(page.getByText("Order Submitted")).toBeVisible();
      await expect(page.getByText("Jordan Guest")).toHaveCount(0);

      const stored = await page.evaluate((venueSlug) => {
        const value = window.localStorage.getItem(`socialize:orders:${venueSlug}`);
        return value ? JSON.parse(value) : [];
      }, venue.slug);

      expect(stored).toHaveLength(1);
      expect(stored[0].customerName).toBe("Jordan Guest");
      expect(stored[0].items[0].name).toBe(itemName);
      expect(stored[0].paymentMethod).toBe("card");
      expect(stored[0].fulfillmentType).toBe("pickup");
    } finally {
      await cleanupMenuArtifacts(client, venue.id, marker);
    }
  });
});
