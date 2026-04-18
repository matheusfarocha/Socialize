import { test, expect, type Page } from "@playwright/test";
import { MENU_ITEM_NAME_MAX_LENGTH } from "../lib/menu-validation";
import {
  cleanupMenuArtifacts,
  createDemoClient,
  getDemoVenue,
  seedMenuCategoryWithItem,
} from "./helpers/supabase-menu";

async function loginToBusiness(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /enter dashboard/i }).click();
  await page.waitForURL("**/");
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Menu Management" })).toBeVisible();
}

test.describe("menu CRUD", () => {
  test("creates a category and item from the dashboard and persists them to Supabase", async ({
    page,
  }) => {
    const marker = `pw-menu-create-${Date.now()}`;
    const categoryName = `${marker} Hot`;
    const itemName = `${marker} Latte`;
    const itemDescription = `${marker} cinnamon oat milk`;
    const itemPrice = "8.75";
    const imageUrl = "https://images.unsplash.com/photo-1517701604599-bb29b565090c";

    const client = await createDemoClient();
    const venue = await getDemoVenue(client);
    await cleanupMenuArtifacts(client, venue.id, marker);

    try {
      await loginToBusiness(page);

      page.once("dialog", async (dialog) => {
        await dialog.accept(categoryName);
      });
      await page.getByTestId("add-category-button").click();

      await expect(page.getByTestId("active-category-name")).toHaveText(categoryName);

      await page.getByTestId("add-item-button").click();

      const draftRow = page.getByTestId("menu-item-row").first();
      await draftRow.getByTestId("menu-item-name").fill(itemName);
      await draftRow.getByTestId("menu-item-description").fill(itemDescription);
      await draftRow.getByTestId("menu-item-price").fill(itemPrice);
      await draftRow.getByTestId("menu-item-image").fill(imageUrl);
      await draftRow.getByTestId("menu-item-save").click();

      await expect(page.getByText(`Created ${itemName}.`)).toBeVisible();

      const { data: createdCategory, error: categoryError } = await client
        .from("menu_categories")
        .select("id, name")
        .eq("venue_id", venue.id)
        .eq("name", categoryName)
        .single();

      expect(categoryError?.message ?? null).toBeNull();
      expect(createdCategory?.name).toBe(categoryName);

      const { data: createdItem, error: itemError } = await client
        .from("menu_items")
        .select("name, description, price, is_active, image_path")
        .eq("category_id", createdCategory!.id)
        .eq("name", itemName)
        .single();

      expect(itemError?.message ?? null).toBeNull();
      expect(createdItem?.name).toBe(itemName);
      expect(createdItem?.description).toBe(itemDescription);
      expect(Number(createdItem?.price)).toBe(Number(itemPrice));
      expect(createdItem?.is_active).toBe(true);
      expect(createdItem?.image_path).toBe(imageUrl);
    } finally {
      await cleanupMenuArtifacts(client, venue.id, marker);
    }
  });

  test("updates and deletes menu resources from the dashboard and persists the changes", async ({
    page,
  }) => {
    const marker = `pw-menu-update-${Date.now()}`;
    const categoryName = `${marker} Brunch`;
    const renamedCategoryName = `${marker} Brunch 2`;
    const itemName = `${marker} Toast`;
    const updatedItemName = `${marker} Toast Deluxe`;

    const client = await createDemoClient();
    const venue = await getDemoVenue(client);
    await cleanupMenuArtifacts(client, venue.id, marker);
    await seedMenuCategoryWithItem(client, venue.id, {
      categoryName,
      itemName,
      description: `${marker} seeded item`,
      price: 11.5,
      imagePath: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
      isActive: true,
    });

    try {
      await loginToBusiness(page);

      await page.getByRole("button", { name: categoryName }).click();
      await expect(page.getByTestId("active-category-name")).toHaveText(categoryName);

      page.once("dialog", async (dialog) => {
        await dialog.accept(renamedCategoryName);
      });
      await page.getByTestId("rename-category-button").click();
      await expect(page.getByTestId("active-category-name")).toHaveText(
        renamedCategoryName,
      );

      const row = page.getByTestId("menu-item-row").first();
      await row.getByTestId("menu-item-name").fill(updatedItemName);
      await row
        .getByTestId("menu-item-description")
        .fill(`${marker} hidden after update`);
      await row.getByTestId("menu-item-price").fill("13.25");
      await row
        .getByTestId("menu-item-image")
        .fill("https://images.unsplash.com/photo-1447933601403-0c6688de566e");
      await row.getByTestId("menu-item-toggle").click();
      await row.getByTestId("menu-item-save").click();

      await expect(page.getByText(`Saved ${updatedItemName}.`)).toBeVisible();

      const { data: updatedCategory, error: updatedCategoryError } = await client
        .from("menu_categories")
        .select("id, name")
        .eq("venue_id", venue.id)
        .eq("name", renamedCategoryName)
        .single();

      expect(updatedCategoryError?.message ?? null).toBeNull();
      expect(updatedCategory?.name).toBe(renamedCategoryName);

      const { data: updatedItem, error: updatedItemError } = await client
        .from("menu_items")
        .select("name, description, price, is_active")
        .eq("category_id", updatedCategory!.id)
        .eq("name", updatedItemName)
        .single();

      expect(updatedItemError?.message ?? null).toBeNull();
      expect(updatedItem?.name).toBe(updatedItemName);
      expect(updatedItem?.description).toBe(`${marker} hidden after update`);
      expect(Number(updatedItem?.price)).toBe(13.25);
      expect(updatedItem?.is_active).toBe(false);

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await row.getByTestId("menu-item-delete").click();
      await expect(
        page.locator(`[data-testid="menu-item-name"][value="${updatedItemName}"]`),
      ).toHaveCount(0);

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByTestId("delete-category-button").click();
      await expect(page.getByRole("button", { name: renamedCategoryName })).toHaveCount(0);

      const { data: deletedCategories, error: deletedCategoryError } = await client
        .from("menu_categories")
        .select("id")
        .eq("venue_id", venue.id)
        .ilike("name", `${marker}%`);

      expect(deletedCategoryError?.message ?? null).toBeNull();
      expect(deletedCategories ?? []).toHaveLength(0);

      const { data: deletedItems, error: deletedItemError } = await client
        .from("menu_items")
        .select("id, name")
        .ilike("name", `${marker}%`);

      expect(deletedItemError?.message ?? null).toBeNull();
      expect(deletedItems ?? []).toHaveLength(0);
    } finally {
      await cleanupMenuArtifacts(client, venue.id, marker);
    }
  });

  test("enforces menu item regex and character limits in the dashboard", async ({
    page,
  }) => {
    const marker = `pw-menu-validate-${Date.now()}`;
    const categoryName = `${marker} Test`;

    const client = await createDemoClient();
    const venue = await getDemoVenue(client);
    await cleanupMenuArtifacts(client, venue.id, marker);

    try {
      await loginToBusiness(page);

      page.once("dialog", async (dialog) => {
        await dialog.accept(categoryName);
      });
      await page.getByTestId("add-category-button").click();
      await expect(page.getByTestId("active-category-name")).toHaveText(categoryName);

      await page.getByTestId("add-item-button").click();

      const row = page.getByTestId("menu-item-row").first();
      const saveButton = row.getByTestId("menu-item-save");
      const longName = "A".repeat(MENU_ITEM_NAME_MAX_LENGTH + 20);

      await row.getByTestId("menu-item-name").fill(longName);
      await expect(row.getByTestId("menu-item-name")).toHaveValue(
        "A".repeat(MENU_ITEM_NAME_MAX_LENGTH),
      );
      await expect(
        row.getByText(`${MENU_ITEM_NAME_MAX_LENGTH}/${MENU_ITEM_NAME_MAX_LENGTH}`),
      ).toBeVisible();

      await row.getByTestId("menu-item-name").fill("@bad name");
      await expect(
        row.getByText("Use letters, numbers, spaces, and basic menu punctuation only."),
      ).toBeVisible();
      await expect(saveButton).toBeDisabled();

      await row.getByTestId("menu-item-name").fill(`${marker} Salad`);
      await row.getByTestId("menu-item-price").fill("12345.67");
      await expect(
        row.getByText("Use up to 4 digits before the decimal and up to 2 after it."),
      ).toBeVisible();
      await expect(saveButton).toBeDisabled();

      await row.getByTestId("menu-item-price").fill("12.75");
      await row.getByTestId("menu-item-image").fill("ftp://invalid-url");
      await expect(
        row.getByText("Image URL must start with http:// or https://"),
      ).toBeVisible();
      await expect(saveButton).toBeDisabled();

      await row.getByTestId("menu-item-cancel").click();
      await expect(row).toHaveCount(0);
    } finally {
      await cleanupMenuArtifacts(client, venue.id, marker);
    }
  });
});
