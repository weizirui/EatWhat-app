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
assert.match(template, /提交清单/);

assert.match(template, /class="\{\{pickedPanelClass\}\}"/);
assert.match(template, /activePickedDetail\.caloriesText/);
assert.match(template, /activePickedDetail\.proteinText/);
assert.match(template, /activePickedDetail\.suitableTags/);
assert.match(template, /activePickedDetail\.swapLines/);
assert.match(template, /activePickedDetail\.conditionAdvice/);
assert.match(template, /activePickedDetail\.stepLines/);
assert.match(styles, /\.picked-body\s*\{[\s\S]*(?<!-)height:\s*66vh;/);
assert.match(styles, /\.picked-sheet\s*\{[\s\S]*z-index:\s*-1;/);
assert.match(styles, /\.picked-sheet-open\s*\{[\s\S]*z-index:\s*26;/);
assert.match(styles, /\.more-recipes-card\s*\{/);

assert.match(template, /联系客服/);
assert.match(template, /open-type="contact"/);

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
