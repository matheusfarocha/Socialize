"use client";

import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/top-bar";
import {
  AlertCircle,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CategoryTabs } from "@/components/ui/category-tabs";
import {
  MenuItemRow,
  type EditableMenuItem,
} from "@/components/menu/menu-item-row";
import {
  MENU_CATEGORY_NAME_MAX_LENGTH,
  MENU_SEARCH_MAX_LENGTH,
  validateCategoryName,
  validateMenuItemFields,
} from "@/lib/menu-validation";

interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

interface MenuDbRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  image_path: string | null;
  sort_order: number;
}

function formatPrice(value: number) {
  return Number.isInteger(value) ? value.toFixed(2) : String(value);
}

function toEditableItem(row: MenuDbRow): EditableMenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    price: formatPrice(row.price),
    isActive: row.is_active,
    imagePath: row.image_path ?? "",
    sortOrder: row.sort_order,
    isDirty: false,
    isDraft: false,
  };
}

function createDraftItem(categoryId: string, sortOrder: number): EditableMenuItem {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    categoryId,
    name: "",
    description: "",
    price: "",
    isActive: true,
    imagePath: "",
    sortOrder,
    isDraft: true,
    isDirty: true,
  };
}

export default function MenuPage() {
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingItemIds, setSavingItemIds] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<EditableMenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadMenu() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData.user;
      if (authError || !user) {
        if (mounted) {
          setError("Please sign in to manage your menu.");
          setLoading(false);
        }
        return;
      }

      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (venueError || !venue) {
        if (mounted) {
          setError("We couldn't find a venue for this account yet.");
          setLoading(false);
        }
        return;
      }

      const { data: categoryRows, error: categoryError } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("venue_id", venue.id)
        .order("sort_order", { ascending: true });

      if (categoryError) {
        if (mounted) {
          setError(categoryError.message);
          setLoading(false);
        }
        return;
      }

      const mappedCategories: MenuCategory[] = (categoryRows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        sortOrder: row.sort_order ?? 0,
      }));

      let mappedItems: EditableMenuItem[] = [];
      if (mappedCategories.length > 0) {
        const categoryIds = mappedCategories.map((category) => category.id);
        const { data: itemRows, error: itemError } = await supabase
          .from("menu_items")
          .select(
            "id, category_id, name, description, price, is_active, image_path, sort_order",
          )
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true });

        if (itemError) {
          if (mounted) {
            setError(itemError.message);
            setLoading(false);
          }
          return;
        }

        mappedItems = (itemRows ?? []).map((row) => toEditableItem(row as MenuDbRow));
      }

      if (!mounted) return;

      setVenueId(venue.id);
      setCategories(mappedCategories);
      setItems(mappedItems);
      setActiveCategoryId((current) => {
        if (current && mappedCategories.some((category) => category.id === current)) {
          return current;
        }
        return mappedCategories[0]?.id ?? "";
      });
      setLoading(false);
    }

    loadMenu().catch((err: unknown) => {
      if (!mounted) return;
      setError(err instanceof Error ? err.message : "Failed to load menu data.");
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? null;

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeCategoryId && item.categoryId !== activeCategoryId) return false;
      if (!query) return true;
      return [item.name, item.description, item.imagePath].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [activeCategoryId, items, searchQuery]);

  function setRowSaving(id: string, saving: boolean) {
    setSavingItemIds((prev) => {
      if (saving) return { ...prev, [id]: true };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateItem(id: string, patch: Partial<EditableMenuItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleAddCategory() {
    if (!venueId || savingCategory) return;
    const name = window.prompt("New category name");
    if (!name) return;

    const trimmed = name.trim();
    const validationError = validateCategoryName(trimmed);
    if (validationError) {
      setError(validationError);
      setStatus("");
      return;
    }

    setSavingCategory(true);
    setError("");
    setStatus("");

    const nextSortOrder =
      categories.reduce((max, category) => Math.max(max, category.sortOrder), -1) + 1;

    const { data, error: insertError } = await supabase
      .from("menu_categories")
      .insert({
        venue_id: venueId,
        name: trimmed,
        sort_order: nextSortOrder,
      })
      .select("id, name, sort_order")
      .single();

    setSavingCategory(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Failed to create category.");
      return;
    }

    const createdCategory: MenuCategory = {
      id: data.id,
      name: data.name,
      sortOrder: data.sort_order ?? nextSortOrder,
    };

    setCategories((prev) => [...prev, createdCategory]);
    setActiveCategoryId(createdCategory.id);
    setStatus(`Created ${trimmed}.`);
  }

  async function handleRenameCategory() {
    if (!activeCategory || savingCategory) return;

    const name = window.prompt("Rename category", activeCategory.name);
    if (!name) return;

    const trimmed = name.trim();
    if (trimmed === activeCategory.name) return;

    const validationError = validateCategoryName(trimmed);
    if (validationError) {
      setError(validationError);
      setStatus("");
      return;
    }

    setSavingCategory(true);
    setError("");
    setStatus("");

    const { error: updateError } = await supabase
      .from("menu_categories")
      .update({ name: trimmed })
      .eq("id", activeCategory.id);

    setSavingCategory(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCategories((prev) =>
      prev.map((category) =>
        category.id === activeCategory.id
          ? { ...category, name: trimmed }
          : category,
      ),
    );
    setStatus(`Renamed category to ${trimmed}.`);
  }

  async function handleDeleteCategory() {
    if (!activeCategory || savingCategory) return;

    const categoryItems = items.filter((item) => item.categoryId === activeCategory.id);
    const confirmed = window.confirm(
      categoryItems.length > 0
        ? `Delete ${activeCategory.name} and its ${categoryItems.length} item(s)?`
        : `Delete ${activeCategory.name}?`,
    );
    if (!confirmed) return;

    setSavingCategory(true);
    setError("");
    setStatus("");

    const persistedItemIds = categoryItems
      .filter((item) => !item.isDraft)
      .map((item) => item.id);

    if (persistedItemIds.length > 0) {
      const { error: deleteItemsError } = await supabase
        .from("menu_items")
        .delete()
        .in("id", persistedItemIds);

      if (deleteItemsError) {
        setSavingCategory(false);
        setError(deleteItemsError.message);
        return;
      }
    }

    const { error: deleteCategoryError } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", activeCategory.id);

    setSavingCategory(false);

    if (deleteCategoryError) {
      setError(deleteCategoryError.message);
      return;
    }

    const deletedCategoryId = activeCategory.id;
    const deletedCategoryName = activeCategory.name;

    const remainingCategories = categories.filter(
      (category) => category.id !== deletedCategoryId,
    );

    setItems((prev) => prev.filter((item) => item.categoryId !== deletedCategoryId));
    setCategories(remainingCategories);
    setActiveCategoryId(remainingCategories[0]?.id ?? "");
    setStatus(`Deleted ${deletedCategoryName}.`);
  }

  function handleAddItem() {
    if (!activeCategory) {
      setError("Create a category first before adding menu items.");
      return;
    }

    const nextSortOrder =
      items
        .filter((item) => item.categoryId === activeCategory.id)
        .reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;

    setItems((prev) => [createDraftItem(activeCategory.id, nextSortOrder), ...prev]);
    setStatus("");
    setError("");
  }

  function handleCancelDraft(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSaveItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    const trimmedName = item.name.trim();
    const trimmedDescription = item.description.trim();
    const trimmedImagePath = item.imagePath.trim();
    const parsedPrice = Number(item.price);

    const fieldErrors = validateMenuItemFields({
      name: item.name,
      description: item.description,
      price: item.price,
      imagePath: item.imagePath,
    });
    const firstError =
      fieldErrors.name ??
      fieldErrors.description ??
      fieldErrors.price ??
      fieldErrors.imagePath ??
      null;

    if (firstError) {
      setError(firstError);
      setStatus("");
      return;
    }

    setRowSaving(id, true);
    setError("");
    setStatus("");

    if (item.isDraft) {
      const payload = {
        category_id: item.categoryId,
        name: trimmedName,
        description: trimmedDescription || null,
        price: parsedPrice,
        is_active: item.isActive,
        image_path: trimmedImagePath || null,
        sort_order: item.sortOrder,
      };

      const { data, error: insertError } = await supabase
        .from("menu_items")
        .insert(payload)
        .select(
          "id, category_id, name, description, price, is_active, image_path, sort_order",
        )
        .single();

      setRowSaving(id, false);

      if (insertError || !data) {
        setError(insertError?.message ?? "Failed to create menu item.");
        return;
      }

      setItems((prev) =>
        prev.map((entry) => (entry.id === id ? toEditableItem(data as MenuDbRow) : entry)),
      );
      setStatus(`Created ${trimmedName}.`);
      return;
    }

    const { error: updateError } = await supabase
      .from("menu_items")
      .update({
        name: trimmedName,
        description: trimmedDescription || null,
        price: parsedPrice,
        is_active: item.isActive,
        image_path: trimmedImagePath || null,
      })
      .eq("id", item.id);

    setRowSaving(id, false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setItems((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              name: trimmedName,
              description: trimmedDescription,
              price: formatPrice(parsedPrice),
              imagePath: trimmedImagePath,
              isDirty: false,
            }
          : entry,
      ),
    );
    setStatus(`Saved ${trimmedName}.`);
  }

  async function handleDeleteItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    const confirmed = window.confirm(
      item.isDraft ? "Discard this new menu item?" : `Delete ${item.name}?`,
    );
    if (!confirmed) return;

    if (item.isDraft) {
      setItems((prev) => prev.filter((entry) => entry.id !== id));
      return;
    }

    setRowSaving(id, true);
    setError("");
    setStatus("");

    const { error: deleteError } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);

    setRowSaving(id, false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((prev) => prev.filter((entry) => entry.id !== id));
    setStatus(`Deleted ${item.name}.`);
  }

  return (
    <>
      <TopBar>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
          Menu Management
        </h1>
        <div className="relative w-64 max-w-md hidden md:block">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            data-testid="menu-search"
            className="w-full pl-12 pr-4 py-3 bg-surface-container-highest rounded-full border-0 focus:ring-2 focus:ring-primary focus:outline-none transition-colors text-sm"
            placeholder="Search menu items..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={MENU_SEARCH_MAX_LENGTH}
          />
        </div>
      </TopBar>

      <div className="flex-1 pt-24 pb-12 px-8 xl:px-16 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
          {error && (
            <div className="flex items-center gap-3 rounded-2xl bg-error-container/60 px-4 py-3 text-sm text-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {status && !error && (
            <div className="rounded-2xl bg-secondary-container/50 px-4 py-3 text-sm text-on-surface">
              {status}
            </div>
          )}

          {loading ? (
            <div className="bg-surface-container-low rounded-[2rem] p-10 flex items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 size={20} className="animate-spin" />
              Loading menu data...
            </div>
          ) : (
            <>
              <CategoryTabs
                categories={categories.map((category) => category.name)}
                activeCategory={activeCategory?.name ?? ""}
                onCategoryChange={(name) => {
                  const next = categories.find((category) => category.name === name);
                  if (next) setActiveCategoryId(next.id);
                }}
              />

              {activeCategory ? (
                <div className="bg-surface-container-low rounded-2xl px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      Active Category
                    </p>
                    <h2
                      data-testid="active-category-name"
                      className="font-headline text-2xl font-bold text-on-surface"
                    >
                      {activeCategory.name}
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {items.filter((item) => item.categoryId === activeCategory.id).length} item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRenameCategory}
                      disabled={savingCategory}
                      data-testid="rename-category-button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface text-on-surface hover:bg-surface-container-highest transition-colors text-sm font-semibold"
                    >
                      <Pencil size={16} />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCategory}
                      disabled={savingCategory}
                      data-testid="delete-category-button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface text-error hover:bg-error-container/50 transition-colors text-sm font-semibold"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-low rounded-[2rem] p-10 text-center">
                  <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">
                    No menu categories yet
                  </h2>
                  <p className="text-on-surface-variant mb-6">
                    Create your first category to start building the menu.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!venueId || savingCategory}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors font-headline font-medium text-sm disabled:opacity-60"
                  >
                    <FolderPlus size={18} />
                    Add Category
                  </button>
                </div>
              )}

              <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-xs text-on-surface-variant">
                Category names: up to {MENU_CATEGORY_NAME_MAX_LENGTH} characters using letters, numbers, spaces, and basic menu punctuation.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!venueId || savingCategory}
                  data-testid="add-category-button"
                  className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface rounded-full hover:bg-surface-variant transition-colors font-headline font-medium text-sm whitespace-nowrap disabled:opacity-60"
                >
                  <FolderPlus size={18} />
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!activeCategory}
                  data-testid="add-item-button"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors font-headline font-medium text-sm whitespace-nowrap disabled:opacity-60"
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>

              {activeCategory && (
                <div className="flex flex-col gap-4">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 text-sm font-headline font-semibold text-on-surface-variant tracking-wide">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-4">Item Name</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="bg-surface-container-low rounded-[2rem] p-10 text-center">
                      <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
                        {searchQuery ? "No matches found" : "No items in this category yet"}
                      </h3>
                      <p className="text-on-surface-variant mb-6">
                        {searchQuery
                          ? "Try a different search term or clear the search field."
                          : "Add your first item to make this category live."}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors font-headline font-medium text-sm"
                        >
                          <Plus size={18} />
                          Add Item
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        saving={Boolean(savingItemIds[item.id])}
                        onChange={updateItem}
                        onSave={handleSaveItem}
                        onDelete={handleDeleteItem}
                        onCancel={handleCancelDraft}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
