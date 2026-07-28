const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const appJson = fs.readFileSync(path.join(root, "app.json"), "utf8");
const pageJson = JSON.parse(fs.readFileSync(path.join(root, "pages/tasks/index.json"), "utf8"));

assert.match(appJson, /pages\/tasks\/index/);
assert.equal(pageJson.navigationBarTitleText, "采购任务");

const templatePath = path.join(root, "pages/tasks/index.wxml");
assert.ok(fs.existsSync(templatePath));

const template = fs.readFileSync(templatePath, "utf8");
const script = fs.readFileSync(path.join(root, "pages/tasks/index.js"), "utf8");
assert.match(template, /我收到的/);
assert.match(template, /我发出的/);
assert.match(template, /displayTasks/);
assert.match(template, /item\.unread/);
assert.match(script, /callCloud\("list_collab_tasks"\)/);
assert.match(script, /receivedTasks/);
assert.match(script, /sentTasks/);
assert.match(script, /loadTasks/);
assert.match(script, /update_collab_task_status/);
assert.match(template, /updateTaskStatus/);
assert.match(template, /item\.actionText/);
assert.match(template, /bindtap="loadTasks"/);
assert.match(template, /重新加载/);
assert.doesNotMatch(template, /wx:elif|wx:else/);

console.log("procurement task page tests passed");
