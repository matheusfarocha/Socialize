"use client";

import { Camera, Save, Trash2, X } from "lucide-react";
import {
  ITEM_DESCRIPTION_REGEX,
  ITEM_DESCRIPTION_RULE_TEXT,
  ITEM_IMAGE_URL_REGEX,
  ITEM_IMAGE_URL_RULE_TEXT,
  ITEM_NAME_REGEX,
  ITEM_NAME_RULE_TEXT,
  ITEM_PRICE_REGEX,
  ITEM_PRICE_RULE_TEXT,
  MENU_ITEM_DESCRIPTION_MAX_LENGTH,
  MENU_ITEM_IMAGE_URL_MAX_LENGTH,
  MENU_ITEM_NAME_MAX_LENGTH,
  validateMenuItemFields,
} from "@/lib/menu-validation";

export interface EditableMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  isActive: boolean;
  imagePath: string;
  sortOrder: number;
  isDraft?: boolean;
  isDirty?: boolean;
}

interface MenuItemRowProps {
  item: EditableMenuItem;
  saving: boolean;
  onChange: (id: string, patch: Partial<EditableMenuItem>) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function MenuItemRow({
  item,
  saving,
  onChange,
  onSave,
  onDelete,
  onCancel,
}: MenuItemRowProps) {
  const fieldErrors = validateMenuItemFields({
    name: item.name,
    description: item.description,
    price: item.price,
    imagePath: item.imagePath,
  });
  const hasErrors = Object.keys(fieldErrors).length > 0;
  const canSave = !hasErrors;
  const firstError =
    fieldErrors.name ??
    fieldErrors.description ??
    fieldErrors.price ??
    fieldErrors.imagePath ??
    null;

  return (
    <div
      data-testid="menu-item-row"
      className="group bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 transition-all duration-200 hover:border-outline-variant/30 hover:bg-surface-container-low"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
        <div className="md:col-span-1 flex items-center">
          <button
            type="button"
            onClick={() => onChange(item.id, { isActive: !item.isActive, isDirty: true })}
            data-testid="menu-item-toggle"
            className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${
              item.isActive
                ? "bg-primary-container"
                : "bg-surface-container-highest"
            }`}
            aria-label={item.isActive ? "Disable menu item" : "Enable menu item"}
          >
            <div
              className={`w-4 h-4 rounded-full transition-transform ${
                item.isActive
                  ? "bg-white translate-x-6"
                  : "bg-on-surface-variant"
              }`}
            />
          </button>
        </div>

        <div className="md:col-span-4">
          <input
            data-testid="menu-item-name"
            className={`w-full bg-transparent border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:ring-0 focus:outline-none p-0 font-headline font-bold text-lg text-on-surface transition-colors ${
              !item.isActive ? "text-on-surface-variant" : ""
            }`}
            type="text"
            value={item.name}
            onChange={(e) => onChange(item.id, { name: e.target.value, isDirty: true })}
            placeholder="Item name"
            maxLength={MENU_ITEM_NAME_MAX_LENGTH}
            pattern={ITEM_NAME_REGEX.source}
            title={fieldErrors.name ?? ITEM_NAME_RULE_TEXT}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          <div className="mt-1 text-[11px] text-on-surface-variant">
            {item.name.length}/{MENU_ITEM_NAME_MAX_LENGTH}
          </div>
        </div>

        <div className="md:col-span-3">
          <input
            data-testid="menu-item-description"
            className="w-full bg-transparent border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:ring-0 focus:outline-none p-0 text-sm text-on-surface-variant transition-colors"
            type="text"
            value={item.description}
            onChange={(e) =>
              onChange(item.id, { description: e.target.value, isDirty: true })
            }
            placeholder="Description"
            maxLength={MENU_ITEM_DESCRIPTION_MAX_LENGTH}
            pattern={ITEM_DESCRIPTION_REGEX.source}
            title={fieldErrors.description ?? ITEM_DESCRIPTION_RULE_TEXT}
            aria-invalid={Boolean(fieldErrors.description)}
          />
          <div className="mt-1 text-[11px] text-on-surface-variant">
            {item.description.length}/{MENU_ITEM_DESCRIPTION_MAX_LENGTH}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface font-medium">
              $
            </span>
            <input
              data-testid="menu-item-price"
              className="w-full bg-transparent border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:ring-0 focus:outline-none pl-4 p-0 font-medium text-on-surface transition-colors"
              type="number"
              min="0"
              step="0.01"
              value={item.price}
              onChange={(e) => onChange(item.id, { price: e.target.value, isDirty: true })}
              placeholder="0.00"
              inputMode="decimal"
              pattern={ITEM_PRICE_REGEX.source}
              title={fieldErrors.price ?? ITEM_PRICE_RULE_TEXT}
              aria-invalid={Boolean(fieldErrors.price)}
            />
          </div>
          <div className="mt-1 text-[11px] text-on-surface-variant">
            Up to 9999.99
          </div>
        </div>

        <div className="md:col-span-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onSave(item.id)}
            disabled={!canSave || saving}
            data-testid="menu-item-save"
            className="h-10 px-4 rounded-full bg-primary text-on-primary text-sm font-headline font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
          {item.isDraft && onCancel ? (
            <button
              type="button"
              onClick={() => onCancel(item.id)}
              data-testid="menu-item-cancel"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              aria-label="Cancel new menu item"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              data-testid="menu-item-delete"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-error transition-colors"
              aria-label="Delete menu item"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-outline-variant/10 pt-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Camera size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Image URL
          </span>
        </div>
        <input
          data-testid="menu-item-image"
          className="flex-1 bg-surface border border-outline-variant/20 rounded-xl px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          type="url"
          value={item.imagePath}
          onChange={(e) => onChange(item.id, { imagePath: e.target.value, isDirty: true })}
          placeholder="https://..."
          maxLength={MENU_ITEM_IMAGE_URL_MAX_LENGTH}
          pattern={ITEM_IMAGE_URL_REGEX.source}
          title={fieldErrors.imagePath ?? ITEM_IMAGE_URL_RULE_TEXT}
          aria-invalid={Boolean(fieldErrors.imagePath)}
        />
        <span className="text-xs font-medium text-on-surface-variant">
          {item.isDraft ? "New item" : item.isDirty ? "Unsaved changes" : "Saved"}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <span
          className={`text-[11px] ${
            firstError ? "text-error" : "text-on-surface-variant"
          }`}
        >
          {firstError ?? "Validation ready"}
        </span>
        <span className="text-[11px] text-on-surface-variant">
          {item.imagePath.length}/{MENU_ITEM_IMAGE_URL_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
