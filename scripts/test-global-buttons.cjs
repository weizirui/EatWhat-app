const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const styles = fs.readFileSync(path.join(root, "app.wxss"), "utf8");

assert.match(styles, /\.btn-primary\s*\{[\s\S]*background:\s*#23a356;/);
assert.match(styles, /\.btn-primary\s*\{[\s\S]*display:\s*flex;/);
assert.match(styles, /\.btn-primary\s*\{[\s\S]*justify-content:\s*center;/);
assert.match(styles, /\.btn-primary\s*\{[\s\S]*align-items:\s*center;/);
assert.match(styles, /\.btn-primary\s*\{[\s\S]*text-align:\s*center;/);

assert.match(styles, /\.btn-secondary\s*\{[\s\S]*display:\s*flex;/);
assert.match(styles, /\.btn-secondary\s*\{[\s\S]*justify-content:\s*center;/);
assert.match(styles, /\.btn-secondary\s*\{[\s\S]*align-items:\s*center;/);
assert.match(styles, /\.btn-secondary\s*\{[\s\S]*text-align:\s*center;/);

assert.match(styles, /\.btn-ghost\s*\{[\s\S]*display:\s*flex;/);
assert.match(styles, /\.btn-ghost\s*\{[\s\S]*justify-content:\s*center;/);
assert.match(styles, /\.btn-ghost\s*\{[\s\S]*align-items:\s*center;/);
assert.match(styles, /\.btn-ghost\s*\{[\s\S]*text-align:\s*center;/);
assert.match(styles, /\.btn-ghost::after\s*\{\s*border:\s*none;\s*\}/);

console.log("global button tests passed");
