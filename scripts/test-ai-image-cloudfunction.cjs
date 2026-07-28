const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "cloudfunctions/generate_food_image/index.js"),
  "utf8",
);
const packageJson = require(path.join(
  root,
  "cloudfunctions/generate_food_image/package.json",
));

assert.equal(packageJson.dependencies["@cloudbase/node-sdk"], "3.18.3");
assert.equal(packageJson.dependencies["@cloudbase/ai"], "2.30.0");
assert.match(source, /DEFAULT_ENV_ID = "cloud1-d9gyz89t28481efb1"/);
assert.match(source, /env: ENV_ID/);
assert.match(source, /app\.ai\(\)\.createImageModel\("hunyuan-image"\)/);
assert.match(source, /HY-Image-3\.0-Plus-4090-Tob-v1\.0/);
assert.match(source, /enable_thinking: \{ value: false \}/);
assert.match(source, /revise: \{ value: false \}/);
assert.match(source, /app\.uploadFile/);
assert.match(source, /cloud_path_invalid/);
assert.match(source, /ai_model_route_not_found/);
console.log("ai image cloudfunction tests passed");
