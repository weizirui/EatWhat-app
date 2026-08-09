const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "pages/match/index.js"), "utf8");
const template = fs.readFileSync(path.join(root, "pages/match/index.wxml"), "utf8");

assert.match(script, /callCloud\("submit_collab_order"/);
assert.match(script, /recipientCount/);
assert.match(script, /selectedReceiverOpenid/);
assert.match(script, /list_collaborators/);
assert.doesNotMatch(script, /send_order_kf_message/);
assert.match(template, /disabled="\{\{submitting\}\}"/);
assert.match(template, /这份清单交给谁/);
assert.match(template, /仅自己保存/);
assert.match(script, /collab_status/);
assert.match(script, /store\.isSetupCompleted\(\)/);
assert.match(template, /完成设置后提交/);
assert.match(template, /当前仅可浏览/);

console.log("match collaboration submit tests passed");
