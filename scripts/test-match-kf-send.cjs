const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "pages/match/index.js"), "utf8");
const template = fs.readFileSync(path.join(root, "pages/match/index.wxml"), "utf8");

assert.match(script, /callCloud\("create_shared_order"/);
assert.match(script, /callCloud\("get_shared_order"/);
assert.match(script, /callCloud\("update_shared_order_status"/);
assert.match(script, /shareId/);
assert.doesNotMatch(script, /send_order_kf_message/);
assert.match(template, /disabled="\{\{submitting\}\}"/);
assert.match(template, /分享给家人/);
assert.match(template, /共享采购状态/);
assert.match(template, /updateShareStatus/);
assert.match(script, /collab_status/);
assert.doesNotMatch(script, /store\.isSetupCompleted\(\)/);
assert.doesNotMatch(template, /完成设置后提交/);
assert.doesNotMatch(template, /当前仅可浏览/);

console.log("match collaboration submit tests passed");
