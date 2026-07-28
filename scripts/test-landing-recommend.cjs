const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommonJsModule(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const dirname = path.dirname(filePath);
  const module = { exports: {} };

  function localRequire(request) {
    const resolved = path.resolve(dirname, request.endsWith(".js") ? request : `${request}.js`);
    return loadCommonJsModule(resolved);
  }

  const context = {
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: dirname,
    __filename: filePath,
    console,
  };

  vm.runInNewContext(code, context, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const { RECIPES } = loadCommonJsModule(path.join(root, "data/recipes.js"));
const { buildLandingSections } = loadCommonJsModule(
  path.join(root, "utils/landing-recommend.js")
);

const julyLanding = buildLandingSections(RECIPES, new Date("2026-07-07T12:00:00"));
const sameDayLanding = buildLandingSections(RECIPES, new Date("2026-07-07T20:00:00"));
const nextDayLanding = buildLandingSections(RECIPES, new Date("2026-07-08T12:00:00"));
const landingStyles = fs.readFileSync(path.join(root, "pages/landing/index.wxss"), "utf8");
const landingTemplate = fs.readFileSync(path.join(root, "pages/landing/index.wxml"), "utf8");

assert.equal(julyLanding.season.key, "summer");
assert.equal(julyLanding.season.title, "夏日时令");
assert.equal(julyLanding.hotRecipes.length, 4);
assert.ok(julyLanding.seasonalRecipes.length >= 3);
assert.ok(julyLanding.soupRecipes.length >= 2);
assert.ok(
  julyLanding.seasonalRecipes.every(
    (item) => item.category !== "汤粥" && item.category !== "甜品"
  )
);
assert.ok(julyLanding.soupRecipes.every((item) => item.category === "汤粥"));
assert.equal(julyLanding.dayKey, "2026-07-07");
assert.deepEqual(
  julyLanding.seasonalRecipes.map((item) => item.id),
  sameDayLanding.seasonalRecipes.map((item) => item.id),
);
assert.deepEqual(
  julyLanding.soupRecipes.map((item) => item.id),
  sameDayLanding.soupRecipes.map((item) => item.id),
);
assert.notDeepEqual(
  julyLanding.seasonalRecipes.map((item) => item.id),
  nextDayLanding.seasonalRecipes.map((item) => item.id),
);
assert.notDeepEqual(
  julyLanding.soupRecipes.map((item) => item.id),
  nextDayLanding.soupRecipes.map((item) => item.id),
);

const octoberLanding = buildLandingSections(RECIPES, new Date("2026-10-10T12:00:00"));
assert.equal(octoberLanding.season.key, "autumn");
assert.equal(octoberLanding.season.title, "秋日时令");
assert.match(landingStyles, /\.pu-hot-grid\s*\{[\s\S]*justify-content:\s*space-between;/);
assert.match(landingStyles, /\.pu-hot-card\s*\{[\s\S]*width:\s*48%;/);
assert.doesNotMatch(landingTemplate, /饭后甜品/);
assert.doesNotMatch(landingTemplate, /pu-banner-btn-ghost/);
assert.doesNotMatch(landingTemplate, /pu-banner-image/);
assert.match(landingTemplate, /class="pu-settings-fab"/);
assert.match(landingStyles, /\.pu-settings-fab\s*\{[\s\S]*left:\s*24rpx;[\s\S]*bottom:\s*40rpx;/);
assert.match(landingStyles, /\.pu-banner-btn\s*\{[\s\S]*background:\s*#23a356;/);
assert.match(landingStyles, /\.landing-page\s*\{[\s\S]*gap:\s*24rpx;/);
assert.match(landingStyles, /\.pu-banner-copy\s*\{[\s\S]*padding:\s*30rpx 28rpx 30rpx;/);
assert.match(landingStyles, /\.pu-banner-actions\s*\{[\s\S]*margin-top:\s*20rpx;/);
assert.match(landingStyles, /\.pu-banner-btn\s*\{[\s\S]*height:\s*92rpx;[\s\S]*border-radius:\s*24rpx;/);
assert.match(landingStyles, /\.pu-grid-card\s*\{[\s\S]*padding:\s*16rpx;[\s\S]*border:\s*2rpx solid rgba\(35, 163, 86, 0\.06\);/);
assert.match(landingStyles, /\.pu-hot-card\s*\{[\s\S]*margin-bottom:\s*16rpx;/);
assert.match(landingStyles, /\.pu-settings-fab\s*\{[\s\S]*bottom:\s*40rpx;/);
assert.match(landingStyles, /\.pu-settings-fab\s*\{[\s\S]*width:\s*76rpx;/);
assert.match(landingStyles, /\.pu-settings-fab\s*\{[\s\S]*height:\s*76rpx;/);

console.log("landing recommend tests passed");
