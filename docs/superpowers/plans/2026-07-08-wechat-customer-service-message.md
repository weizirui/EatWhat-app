# 提交订单同步到微信客服消息 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户提交订单后，在微信「客服会话」里收到一条订单摘要消息（失败不影响下单流程）。

**Architecture:** 小程序端负责拼装“订单摘要文本”并调用云端发送；云端函数拿到当前用户 openid 后调用微信 OpenAPI 发送客服消息。小程序内提供“联系客服”入口，用于建立可发送消息的会话关系。

**Tech Stack:** 微信小程序原生 + 微信云开发 + 云函数（wx-server-sdk / OpenAPI）

---

## Files
- Modify: [app.js](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/app.js)
- Modify: [pages/match/index.wxml](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/pages/match/index.wxml)
- Modify: [pages/match/index.js](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/pages/match/index.js)
- Modify: [scripts/test-match-page.cjs](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/scripts/test-match-page.cjs)
- Create: `cloudfunctions/send_order_kf_message/index.js`
- Create: `cloudfunctions/send_order_kf_message/package.json`
- Create: `scripts/test-kf-cloudfunction.cjs`
- Create: `utils/order-message.js`
- Create: `scripts/test-order-message.cjs`

---

### Task 1: 增加“联系客服”入口（用于建立会话）

**Files:**
- Modify: [scripts/test-match-page.cjs](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/scripts/test-match-page.cjs)
- Modify: [pages/match/index.wxml](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/pages/match/index.wxml)
- (Optional) Modify: [pages/match/index.wxss](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/pages/match/index.wxss)

- [ ] **Step 1: 写一个会失败的测试（要求模板里出现“联系客服”+ contact 入口）**

在 `scripts/test-match-page.cjs` 里追加断言（示例）：

```js
assert.match(template, /联系客服/);
assert.match(template, /open-type="contact"/);
```

- [ ] **Step 2: 运行测试，确认是红的**

Run:

```bash
node scripts/test-match-page.cjs
```

Expected: FAIL（找不到“联系客服”或 `open-type="contact"`）

- [ ] **Step 3: 改模板让测试变绿**

在 `pages/match/index.wxml` 的底部固定操作区 `match-fab` 内，增加一个轻量按钮：

```xml
<button class="match-fab-kf" open-type="contact">联系客服</button>
```

如果需要更一致的按钮风格，再在 `pages/match/index.wxss` 增加 `.match-fab-kf` 样式（参考现有 `.match-fab-info` 的高度与圆角即可）。

- [ ] **Step 4: 再跑测试确认变绿**

```bash
node scripts/test-match-page.cjs
```

---

### Task 2: 开启云开发初始化（不写死环境 ID）

**Files:**
- Modify: [app.js](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/app.js)
- Create: `scripts/test-cloud-init.cjs`（可选；若不想新增测试文件，可跳过）

- [ ] **Step 1: （手动前置）在微信开发者工具开通云开发**
- 打开项目 → 顶部「云开发」→ 开通（创建任意环境即可）

- [ ] **Step 2: 写一个会失败的测试（可选）**

`scripts/test-cloud-init.cjs`（示例）读取 `app.js` 并断言存在 `wx.cloud.init`：

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
assert.match(app, /wx\.cloud\.init/);
console.log("cloud init tests passed");
```

- [ ] **Step 3: 修改 `app.js` 初始化云开发（使用动态环境）**

目标形态：

```js
App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true,
      });
    }
  },
});
```

- [ ] **Step 4: 跑可选测试（如果创建了）**

```bash
node scripts/test-cloud-init.cjs
```

---

### Task 3: 新增云端函数：发送客服消息

**Files:**
- Create: `cloudfunctions/send_order_kf_message/index.js`
- Create: `cloudfunctions/send_order_kf_message/package.json`
- Create: `scripts/test-kf-cloudfunction.cjs`

- [ ] **Step 1: 写一个会失败的测试（要求云端函数文件存在且包含关键调用）**

`scripts/test-kf-cloudfunction.cjs`（示例）：

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "cloudfunctions/send_order_kf_message/index.js");
assert.ok(fs.existsSync(file));
const code = fs.readFileSync(file, "utf8");
assert.match(code, /customerServiceMessage\.send/);
console.log("kf cloudfunction tests passed");
```

- [ ] **Step 2: 运行测试，确认是红的**

```bash
node scripts/test-kf-cloudfunction.cjs
```

- [ ] **Step 3: 写最小云端函数实现**

`cloudfunctions/send_order_kf_message/index.js`（示例，纯文本）：

```js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const text = String(event && event.text ? event.text : "").trim();
  if (!text) {
    return { ok: false, reason: "empty_text" };
  }

  await cloud.openapi.customerServiceMessage.send({
    touser: OPENID,
    msgtype: "text",
    text: { content: text },
  });

  return { ok: true };
};
```

`cloudfunctions/send_order_kf_message/package.json`（示例）：

```json
{
  "name": "send_order_kf_message",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 4: 再跑测试确认变绿**

```bash
node scripts/test-kf-cloudfunction.cjs
```

---

### Task 4: 小程序端拼装订单摘要文本

**Files:**
- Create: `utils/order-message.js`
- Create: `scripts/test-order-message.cjs`

- [ ] **Step 1: 写一个会失败的测试（截断规则 + 空字段容错）**

`scripts/test-order-message.cjs`（示例）：

```js
const assert = require("node:assert/strict");
const { buildOrderMessage } = require("../utils/order-message");

const text = buildOrderMessage({
  orderId: "20260708-123456",
  recipes: ["紫菜蛋花汤", "清蒸鲈鱼", "番茄炒蛋", "红烧肉", "青菜", "土豆丝"],
  suggested: ["海带", "姜", "葱", "蒜", "盐", "油"],
});

assert.match(text, /已收到你的订单/);
assert.match(text, /订单号/);
assert.ok(text.includes("等"));
assert.ok(text.length <= 220);

const empty = buildOrderMessage({ orderId: "", recipes: [], suggested: [] });
assert.match(empty, /已收到你的订单/);

console.log("order message tests passed");
```

- [ ] **Step 2: 跑测试确认红**

```bash
node scripts/test-order-message.cjs
```

- [ ] **Step 3: 写最小实现**

`utils/order-message.js`（示例实现思路）：
- 固定头部
- 菜谱最多 5 个
- 建议购买最多 6 个
- 超出用“等 N 道/等 N 项”
- 总长度硬截断（例如 220 字符）

- [ ] **Step 4: 跑测试确认绿**

```bash
node scripts/test-order-message.cjs
```

---

### Task 5: 提交订单后调用云端发送客服消息（失败不阻断）

**Files:**
- Modify: [pages/match/index.js](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/pages/match/index.js)
- (Optional) Modify: [scripts/test-match-page.cjs](file:///Users/mac/Desktop/trae%20solo%20test/6a4c5bf26fa2723f0caa70b3/scripts/test-match-page.cjs)

- [ ] **Step 1: 写一个会失败的断言（可选，约束必须调用云端函数名）**

如果希望自动化兜底，可在 `scripts/test-match-page.cjs` 之外新增一个脚本读取 `pages/match/index.js` 并断言包含：
- `wx.cloud.callFunction`
- 函数名 `send_order_kf_message`

- [ ] **Step 2: 修改 `submitOrder`**

在 `store.saveOrder(order)` 后，发起云端调用：

```js
wx.cloud.callFunction({
  name: "send_order_kf_message",
  data: { text },
}).catch(() => {
  wx.showToast({
    title: "想收到微信消息提醒，先点一次联系客服",
    icon: "none",
  });
});
```

其中 `text` 由 `utils/order-message.js` 生成，recipes/suggested 通过 `getRecipesByIds` / `getIngredientsByIds` 拿中文名列表即可。

- [ ] **Step 3: 回归脚本**

```bash
node scripts/test-copywriting.cjs
node scripts/test-match-page.cjs
node scripts/test-procurement-split.cjs
node scripts/test-recipes-order-fallback.cjs
```

---

## 手动验收清单（真机）
- [ ] 先点一次「联系客服」打开会话
- [ ] 回到匹配页提交订单
- [ ] 微信客服会话里收到“已收到你的订单”的文本消息
- [ ] 不点联系客服直接提交：不会影响下单，只会在小程序内提示一次

