const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function listFiles(dir, exts) {
  const output = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...listFiles(full, exts));
      return;
    }
    if (exts.some((ext) => entry.name.endsWith(ext))) {
      output.push(full);
    }
  });
  return output;
}

const root = path.resolve(__dirname, "..");
const pagesRoot = path.join(root, "pages");
const files = listFiles(pagesRoot, [".wxml", ".js"]);

const banned = [
  /系统/,
  /强关联/,
  /方案\s*B/,
  /本地订单流/,
  /本地订单/,
  /云函数/,
  /订阅消息/,
];

const violations = [];
files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  banned.forEach((rule) => {
    if (rule.test(content)) {
      violations.push({ file, rule: String(rule) });
    }
  });
});

assert.equal(
  violations.length,
  0,
  `copywriting contains banned terms:\n${violations
    .map((item) => `- ${item.file} matched ${item.rule}`)
    .join("\n")}`,
);

console.log("copywriting tests passed");
