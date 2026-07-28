const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const template = fs.readFileSync(path.join(root, "pages/recipes/index.wxml"), "utf8");
const script = fs.readFileSync(path.join(root, "pages/recipes/index.js"), "utf8");

assert.match(template, /bindtap="toggleRecipeDetail"/);
assert.match(template, /wx:if="\{\{item\.open\}\}"/);
assert.match(template, /class="profile-grid"/);
assert.match(template, /item\.proteinText/);
assert.match(template, /item\.swapLines/);
assert.match(template, /item\.conditionAdvice/);
assert.match(script, /open:\s*false/);
assert.match(script, /toggleRecipeDetail/);
assert.match(script, /proteinText:\s*profile\.proteinText/);
assert.match(script, /swapLines:\s*profile\.swapLines/);
assert.match(script, /conditionAdvice:\s*profile\.conditionAdvice/);

console.log("recipes page tests passed");
