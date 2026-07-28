const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "cloudfunctions/send_order_kf_message/index.js");

assert.ok(fs.existsSync(file));

const code = fs.readFileSync(file, "utf8");
assert.match(code, /customerServiceMessage\.send/);

console.log("kf cloudfunction tests passed");
