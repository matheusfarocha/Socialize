export const MENU_SEARCH_MAX_LENGTH = 80;
export const MENU_CATEGORY_NAME_MAX_LENGTH = 40;
export const MENU_ITEM_NAME_MAX_LENGTH = 60;
export const MENU_ITEM_DESCRIPTION_MAX_LENGTH = 180;
export const MENU_ITEM_IMAGE_URL_MAX_LENGTH = 500;

export const CATEGORY_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 &'.,()\/+-]*$/;
export const ITEM_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 &'.,()\/+-]*$/;
export const ITEM_DESCRIPTION_REGEX = /^[A-Za-z0-9 &'".,()\/+!?:;%\-]*$/;
export const ITEM_PRICE_REGEX = /^\d{1,4}(?:\.\d{1,2})?$/;
export const ITEM_IMAGE_URL_REGEX =
  /^https?:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/i;

export const CATEGORY_NAME_RULE_TEXT =
  "Use letters, numbers, spaces, and basic menu punctuation only.";
export const ITEM_NAME_RULE_TEXT =
  "Use letters, numbers, spaces, and basic menu punctuation only.";
export const ITEM_DESCRIPTION_RULE_TEXT =
  "Description supports letters, numbers, spaces, and common punctuation.";
export const ITEM_PRICE_RULE_TEXT =
  "Use up to 4 digits before the decimal and up to 2 after it.";
export const ITEM_IMAGE_URL_RULE_TEXT =
  "Image URL must start with http:// or https://";

export type MenuItemFieldErrors = Partial<
  Record<"name" | "description" | "price" | "imagePath", string>
>;

function hasText(value: string) {
  return value.trim().length > 0;
}

export function validateCategoryName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "Category name is required.";
  if (trimmed.length > MENU_CATEGORY_NAME_MAX_LENGTH) {
    return `Category name must be ${MENU_CATEGORY_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!CATEGORY_NAME_REGEX.test(trimmed)) {
    return CATEGORY_NAME_RULE_TEXT;
  }

  return null;
}

export function validateMenuItemFields(input: {
  name: string;
  description: string;
  price: string;
  imagePath: string;
}) {
  const errors: MenuItemFieldErrors = {};
  const trimmedName = input.name.trim();
  const trimmedDescription = input.description.trim();
  const trimmedPrice = input.price.trim();
  const trimmedImagePath = input.imagePath.trim();

  if (!trimmedName) {
    errors.name = "Menu item name is required.";
  } else if (trimmedName.length > MENU_ITEM_NAME_MAX_LENGTH) {
    errors.name = `Menu item name must be ${MENU_ITEM_NAME_MAX_LENGTH} characters or fewer.`;
  } else if (!ITEM_NAME_REGEX.test(trimmedName)) {
    errors.name = ITEM_NAME_RULE_TEXT;
  }

  if (trimmedDescription.length > MENU_ITEM_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${MENU_ITEM_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  } else if (hasText(trimmedDescription) && !ITEM_DESCRIPTION_REGEX.test(trimmedDescription)) {
    errors.description = ITEM_DESCRIPTION_RULE_TEXT;
  }

  if (!trimmedPrice) {
    errors.price = "Price is required.";
  } else if (!ITEM_PRICE_REGEX.test(trimmedPrice)) {
    errors.price = ITEM_PRICE_RULE_TEXT;
  }

  if (trimmedImagePath.length > MENU_ITEM_IMAGE_URL_MAX_LENGTH) {
    errors.imagePath = `Image URL must be ${MENU_ITEM_IMAGE_URL_MAX_LENGTH} characters or fewer.`;
  } else if (hasText(trimmedImagePath) && !ITEM_IMAGE_URL_REGEX.test(trimmedImagePath)) {
    errors.imagePath = ITEM_IMAGE_URL_RULE_TEXT;
  }

  return errors;
}
