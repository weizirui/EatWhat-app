const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommonJsModule(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const dirname = path.dirname(filePath);
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: (request) => {
      const resolved = path.resolve(dirname, request.endsWith(".js") ? request : `${request}.js`);
      return loadCommonJsModule(resolved);
    },
    __dirname: dirname,
    __filename: filePath,
    console,
  };
  vm.runInNewContext(code, context, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const { buildOrderMessage } = loadCommonJsModule(path.join(root, "utils/order-message.js"));

const text = buildOrderMessage({
  orderId: "20260708-123456",
  recipes: ["紫菜蛋花汤", "清蒸鲈鱼", "番茄炒蛋", "红烧肉", "青菜", "土豆丝"],
  suggested: ["海带", "姜", "葱", "蒜", "盐", "油", "酱油"],
});

assert.match(text, /已收到你的订单/);
assert.match(text, /订单号/);
assert.ok(text.includes("等"));
assert.ok(text.length <= 220);

const empty = buildOrderMessage({ orderId: "", recipes: [], suggested: [] });
assert.match(empty, /已收到你的订单/);

console.log("order message tests passed");
