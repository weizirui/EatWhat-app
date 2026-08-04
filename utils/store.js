const STORAGE_KEYS = {
  selectedIngredients: "qx_selected_ingredients",
  suggestedPurchaseIngredients: "qx_suggested_purchase_ingredients",
  pickedRecipes: "qx_picked_recipes",
  favoriteRecipes: "qx_favorite_recipes",
  settings: "qx_mini_settings",
  lastOrder: "qx_last_order",
  orders: "qx_orders",
};

const DEFAULT_SETTINGS = {
  contactName: "",
  defaultRemark: "",
  mealTimeOffset: 30,
  defaultReceiverOpenid: "",
  collabDisplayName: "",
};

function readStorage(key, fallbackValue) {
  try {
    const value = wx.getStorageSync(key);
    return value === "" || value === undefined ? fallbackValue : value;
  } catch (error) {
    return fallbackValue;
  }
}

function writeStorage(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function unique(list) {
  return Array.from(new Set(list));
}

function getSelectedIngredients() {
  return readStorage(STORAGE_KEYS.selectedIngredients, []);
}

function getSuggestedPurchaseIngredients() {
  return readStorage(STORAGE_KEYS.suggestedPurchaseIngredients, []);
}

function writeSuggestedPurchaseIngredients(ids) {
  const owned = getSelectedIngredients();
  const next = unique(ids).filter((id) => !owned.includes(id));
  return writeStorage(STORAGE_KEYS.suggestedPurchaseIngredients, next);
}

function toggleIngredient(id) {
  const selected = getSelectedIngredients();
  const next = selected.includes(id)
    ? selected.filter((item) => item !== id)
    : selected.concat(id);
  const written = writeStorage(STORAGE_KEYS.selectedIngredients, next);
  if (!selected.includes(id)) {
    writeSuggestedPurchaseIngredients(
      getSuggestedPurchaseIngredients().filter((item) => item !== id),
    );
  }
  return written;
}

function addManyIngredients(ids) {
  const next = unique(getSelectedIngredients().concat(ids));
  const written = writeStorage(STORAGE_KEYS.selectedIngredients, next);
  writeSuggestedPurchaseIngredients(
    getSuggestedPurchaseIngredients().filter((id) => !next.includes(id)),
  );
  return written;
}

function clearSelectedIngredients() {
  return writeStorage(STORAGE_KEYS.selectedIngredients, []);
}

function addSuggestedPurchaseIngredients(ids) {
  return writeSuggestedPurchaseIngredients(getSuggestedPurchaseIngredients().concat(ids));
}

function removeSuggestedPurchaseIngredient(id) {
  return writeSuggestedPurchaseIngredients(
    getSuggestedPurchaseIngredients().filter((item) => item !== id),
  );
}

function clearSuggestedPurchaseIngredients() {
  return writeStorage(STORAGE_KEYS.suggestedPurchaseIngredients, []);
}

function getAllIngredientIds() {
  return unique(getSelectedIngredients().concat(getSuggestedPurchaseIngredients()));
}

function getPickedRecipes() {
  return readStorage(STORAGE_KEYS.pickedRecipes, []);
}

function togglePickedRecipe(id) {
  const picked = getPickedRecipes();
  const next = picked.includes(id)
    ? picked.filter((item) => item !== id)
    : picked.concat(id);
  return writeStorage(STORAGE_KEYS.pickedRecipes, next);
}

function setPickedRecipes(ids) {
  return writeStorage(STORAGE_KEYS.pickedRecipes, unique(ids));
}

function addPickedRecipes(ids) {
  const next = unique(getPickedRecipes().concat(ids || []));
  return writeStorage(STORAGE_KEYS.pickedRecipes, next);
}

function clearPickedRecipes() {
  return writeStorage(STORAGE_KEYS.pickedRecipes, []);
}

function getFavoriteRecipes() {
  return readStorage(STORAGE_KEYS.favoriteRecipes, []);
}

function isFavoriteRecipe(id) {
  return getFavoriteRecipes().includes(id);
}

function toggleFavoriteRecipe(id) {
  const favorites = getFavoriteRecipes();
  const next = favorites.includes(id)
    ? favorites.filter((item) => item !== id)
    : favorites.concat(id);
  return writeStorage(STORAGE_KEYS.favoriteRecipes, next);
}

function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, readStorage(STORAGE_KEYS.settings, {}));
}

function updateSettings(patch) {
  return writeStorage(
    STORAGE_KEYS.settings,
    Object.assign({}, getSettings(), patch),
  );
}

function resetSettings() {
  return writeStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

function getLastOrder() {
  return readStorage(STORAGE_KEYS.lastOrder, null);
}

function getOrders() {
  return readStorage(STORAGE_KEYS.orders, []);
}

function getOrderById(id) {
  if (!id) {
    return null;
  }
  return getOrders().find((item) => item.id === id) || null;
}

/**
 * 保存或更新本地订单。
 * @param {object} order 完整订单对象，必须包含唯一 id。
 * @returns {object} 已保存的订单。
 */
function saveOrder(order) {
  const orders = [order]
    .concat(getOrders().filter((item) => item.id !== order.id))
    .slice(0, 20);
  writeStorage(STORAGE_KEYS.lastOrder, order);
  writeStorage(STORAGE_KEYS.orders, orders);
  return order;
}

function clearOrders() {
  writeStorage(STORAGE_KEYS.lastOrder, null);
  writeStorage(STORAGE_KEYS.orders, []);
}

module.exports = {
  DEFAULT_SETTINGS,
  getSelectedIngredients,
  getSuggestedPurchaseIngredients,
  toggleIngredient,
  addManyIngredients,
  clearSelectedIngredients,
  addSuggestedPurchaseIngredients,
  removeSuggestedPurchaseIngredient,
  clearSuggestedPurchaseIngredients,
  getAllIngredientIds,
  getPickedRecipes,
  togglePickedRecipe,
  setPickedRecipes,
  addPickedRecipes,
  clearPickedRecipes,
  getFavoriteRecipes,
  isFavoriteRecipe,
  toggleFavoriteRecipe,
  getSettings,
  updateSettings,
  resetSettings,
  getLastOrder,
  getOrders,
  getOrderById,
  saveOrder,
  clearOrders,
};
