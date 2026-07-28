const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

assert.match(app, /wx\.cloud\.init/);
assert.match(app, /env:\s*CLOUD_ENV_ID\s*\|\|\s*wx\.cloud\.DYNAMIC_CURRENT_ENV/);

console.log("cloud init tests passed");
