const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommonJsModule(filePath, extras) {
  const code = fs.readFileSync(filePath, "utf8");
  const dirname = path.dirname(filePath);
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: (request) => {
      const resolved = path.resolve(dirname, request.endsWith(".js") ? request : `${request}.js`);
      return loadCommonJsModule(resolved, extras);
    },
    __dirname: dirname,
    __filename: filePath,
    console,
    ...extras,
  };
  vm.runInNewContext(code, context, { filename: filePath });
  return module.exports;
}

const root = path.resolve(__dirname, "..");
const storage = new Map();
const wx = {
  getStorageSync(key) {
    return storage.get(key);
  },
  setStorageSync(key, value) {
    storage.set(key, value);
  },
};

const store = loadCommonJsModule(path.join(root, "utils/store.js"), { wx });

assert.equal(store.getSettings().defaultReceiverOpenid, "");
assert.equal(store.getSettings().collabDisplayName, "");

store.updateSettings({
  defaultReceiverOpenid: "user-b",
  collabDisplayName: "小王",
});

assert.equal(store.getSettings().defaultReceiverOpenid, "user-b");
assert.equal(store.getSettings().collabDisplayName, "小王");

console.log("collaboration store tests passed");
