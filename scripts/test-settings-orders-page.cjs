const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const settingsTemplate = fs.readFileSync(path.join(root, "pages/settings/index.wxml"), "utf8");
const settingsScript = fs.readFileSync(path.join(root, "pages/settings/index.js"), "utf8");
const successScript = fs.readFileSync(path.join(root, "pages/checkout-success/index.js"), "utf8");
const successTemplate = fs.readFileSync(path.join(root, "pages/checkout-success/index.wxml"), "utf8");
const storeScript = fs.readFileSync(path.join(root, "utils/store.js"), "utf8");

assert.doesNotMatch(settingsTemplate, /默认联系人/);
assert.doesNotMatch(settingsTemplate, /默认备注/);
assert.doesNotMatch(settingsTemplate, /默认用餐时间偏移/);
assert.doesNotMatch(settingsTemplate, /保存设置/);
assert.match(settingsTemplate, /已保存订单/);
assert.match(settingsTemplate, /查看详情/);
assert.match(settingsScript, /openOrderDetail/);
assert.match(successScript, /getOrderById/);
assert.match(successScript, /setNavigationBarTitle/);
assert.match(successScript, /source === "settings"/);
assert.match(successScript, /navigateBack/);
assert.match(successScript, /orderId=\$\{encodeURIComponent\(this\.data\.order\.id\)\}/);
assert.match(successScript, /retryCollaboration/);
assert.match(successScript, /submit_collab_order/);
assert.match(successScript, /\["failed", "pending"\]/);
assert.match(successTemplate, /重新发送协作清单/);
assert.match(successTemplate, /订单概览/);
assert.match(storeScript, /function getOrderById/);

console.log("settings orders page tests passed");
