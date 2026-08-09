const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "pages/home/index.js"), "utf8");
const template = fs.readFileSync(path.join(root, "pages/home/index.wxml"), "utf8");
const styles = fs.readFileSync(path.join(root, "pages/home/index.wxss"), "utf8");

assert.match(source, /store\.getFavoriteRecipes\(\)/);
assert.match(source, /toggleFavorite\(event\)/);
assert.match(source, /store\.toggleFavoriteRecipe\(id\)/);
assert.match(source, /showFavorites\(\)/);
assert.match(source, /activeCategory:\s*"favorites"/);
assert.match(source, /favoriteCount:\s*favoriteIds\.length/);
assert.match(source, /favoritesFilterText:\s*isFavorites\s*\?\s*"返回原分类"/);
assert.match(source, /onPageScroll\(event\)/);
assert.match(source, /wx\.pageScrollTo/);

assert.match(template, /bindtap="showFavorites"/);
assert.match(template, /catchtap="toggleFavorite"/);
assert.match(template, /catchtap="toggleRecipe"/);
assert.match(template, /\{\{item\.favoriteIcon\}\}/);
assert.match(template, /\{\{item\.stateIcon\}\}/);
assert.match(template, /\{\{favoritesFilterText\}\}/);

assert.match(styles, /\.category-controls\s*\{/);
assert.match(styles, /\.favorites-filter-active\s*\{/);
assert.match(styles, /\.ingredient-actions\s*\{/);
assert.match(styles, /\.ingredient-action-favorite-active\s*\{/);

console.log("home favorites tests passed");
