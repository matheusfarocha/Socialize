import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@socialize.app";
const DEMO_PASSWORD = "demo1234";

type EnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export interface DemoVenue {
  id: string;
  slug: string;
  name: string;
}

let cachedEnv: EnvShape | null = null;

function readEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const file = fs.readFileSync(envPath, "utf8");
  const pairs = file
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)] as const;
    });

  return Object.fromEntries(pairs) as Partial<EnvShape>;
}

function getEnv(): EnvShape {
  if (cachedEnv) return cachedEnv;

  const fileEnv = readEnvFile();
  const env = {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
  };

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase public env values are required for E2E tests.");
  }

  cachedEnv = env;
  return env;
}

export async function createDemoClient() {
  const env = getEnv();
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { error } = await client.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error) {
    throw new Error(`Failed to sign in demo account: ${error.message}`);
  }

  return client;
}

export async function getDemoVenue(client: SupabaseClient): Promise<DemoVenue> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message ?? "Demo user is not available.");
  }

  const { data, error } = await client
    .from("venues")
    .select("id, slug, name")
    .eq("owner_id", user.id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Demo venue is not available.");
  }

  return data as DemoVenue;
}

export async function cleanupMenuArtifacts(
  client: SupabaseClient,
  venueId: string,
  prefix: string,
) {
  const { data: categories, error: categoryError } = await client
    .from("menu_categories")
    .select("id, name")
    .eq("venue_id", venueId)
    .ilike("name", `${prefix}%`);

  if (categoryError) {
    throw new Error(`Failed to load categories for cleanup: ${categoryError.message}`);
  }

  const categoryIds = (categories ?? []).map((category) => category.id);

  if (categoryIds.length > 0) {
    const { error: deleteItemsError } = await client
      .from("menu_items")
      .delete()
      .in("category_id", categoryIds);

    if (deleteItemsError) {
      throw new Error(`Failed to delete items during cleanup: ${deleteItemsError.message}`);
    }

    const { error: deleteCategoriesError } = await client
      .from("menu_categories")
      .delete()
      .in("id", categoryIds);

    if (deleteCategoriesError) {
      throw new Error(
        `Failed to delete categories during cleanup: ${deleteCategoriesError.message}`,
      );
    }
  }
}

export async function seedMenuCategoryWithItem(
  client: SupabaseClient,
  venueId: string,
  input: {
    categoryName: string;
    itemName: string;
    description: string;
    price: number;
    imagePath?: string;
    isActive?: boolean;
  },
) {
  const { data: existingCategories } = await client
    .from("menu_categories")
    .select("sort_order")
    .eq("venue_id", venueId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextCategorySortOrder = (existingCategories?.[0]?.sort_order ?? -1) + 1;

  const { data: category, error: categoryError } = await client
    .from("menu_categories")
    .insert({
      venue_id: venueId,
      name: input.categoryName,
      sort_order: nextCategorySortOrder,
    })
    .select("id")
    .single();

  if (categoryError || !category) {
    throw new Error(categoryError?.message ?? "Failed to seed menu category.");
  }

  const { error: itemError } = await client.from("menu_items").insert({
    category_id: category.id,
    name: input.itemName,
    description: input.description,
    price: input.price,
    is_active: input.isActive ?? true,
    image_path: input.imagePath ?? null,
    sort_order: 0,
  });

  if (itemError) {
    throw new Error(itemError.message);
  }

  return category.id;
}
