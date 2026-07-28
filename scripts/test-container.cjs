const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const filePath = path.join(root, "utils/container.js");
const code = fs.readFileSync(filePath, "utf8");
const sandboxModule = { exports: {} };
vm.runInNewContext(code, {
  module: sandboxModule,
  exports: sandboxModule.exports,
  console,
}, { filename: filePath });

const container = sandboxModule.exports;
assert.equal(container.CONTAINER_ENV, "prod-d7g17s01j3c2e063");
assert.equal(container.CONTAINER_SERVICE, "springboot-5bbi");
assert.equal(JSON.stringify(container.normalizeContainerResponse({ data: "" })), "{}");
assert.equal(JSON.stringify(container.normalizeContainerResponse({ data: "{\"count\":1}" })), "{\"count\":1}");
assert.equal(JSON.stringify(container.normalizeContainerResponse({ data: "ok" })), "{\"data\":\"ok\"}");
assert.equal(JSON.stringify(container.normalizeContainerResponse({ data: { count: 1 } })), "{\"count\":1}");

console.log("container utils tests passed");
