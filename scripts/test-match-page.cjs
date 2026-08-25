const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const template = fs.readFileSync(path.join(root, "pages/match/index.wxml"), "utf8");
const styles = fs.readFileSync(path.join(root, "pages/match/index.wxss"), "utf8");

assert.match(template, /class="match-fab"/);
assert.match(styles, /\.match-fab\s*\{[\s\S]*position:\s*fixed;/);
assert.match(template, /wx:for="\{\{purchaseIngredients\}\}"/);
assert.match(template, /wx:for="\{\{selectedRecipes\}\}"/);
assert.match(template, /item\.ingredientText/);
assert.match(template, /purchaseIngredientsText/);
assert.match(template, /selectedRecipesText/);
assert.match(template, /生成采购单/);

assert.doesNotMatch(template, /pickedPanelClass/);
assert.doesNotMatch(template, /activePickedDetail/);
assert.doesNotMatch(styles, /\.picked-sheet/);
assert.match(styles, /\.more-recipes-card\s*\{/);

assert.doesNotMatch(template, /菜谱档案/);
assert.doesNotMatch(template, /联系客服/);
assert.doesNotMatch(template, /open-type="contact"/);

assert.equal(template.includes("订单信息"), false);
assert.equal(template.includes("联系人"), false);
assert.equal(template.includes('bindinput="updateContactName"'), false);
assert.equal(template.includes('bindtap="submitOrder"'), true);

const recipeListStart = template.indexOf('wx:for="{{selectedRecipes}}"');
assert.ok(recipeListStart > -1);
const recipeListEnd = template.indexOf('class="section empty-card"');
assert.ok(recipeListEnd > recipeListStart);
const recipeListBlock = template.slice(recipeListStart, recipeListEnd);
assert.ok(!recipeListBlock.includes("stepLines"));

console.log("match page tests passed");
