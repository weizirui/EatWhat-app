# Procurement Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将手动已选食材与系统建议购买食材在页面和订单提交中同时拆分展示与保存。

**Architecture:** 以 `utils/store.js` 为单一状态来源，新增 `suggested_purchase_ids` 持久化，并通过合并后的 `all_ingredient_ids` 驱动匹配逻辑。首页、匹配页、成功页分别消费“已有 / 系统建议购买 / 总食材”三类信息，提交流程同步升级为三套字段。

**Tech Stack:** 微信小程序、CommonJS、WXML、WXSS、Node.js 脚本断言测试

---

### Task 1: 先写失败测试锁定采购拆分结构

**Files:**
- Create: `scripts/test-procurement-split.cjs`
- Modify: `scripts/test-match-page.cjs`

- [ ] **Step 1: 写 store 与订单结构的失败测试**

```js
assert.deepEqual(store.getSuggestedPurchaseIngredients(), []);
store.addSuggestedPurchaseIngredients(["ginger", "scallion"]);
assert.deepEqual(store.getSuggestedPurchaseIngredients(), ["ginger", "scallion"]);
assert.deepEqual(store.getAllIngredientIds(), ["egg", "ginger", "scallion"]);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node scripts/test-procurement-split.cjs`
Expected: FAIL，提示 `getSuggestedPurchaseIngredients` 或 `getAllIngredientIds` 未定义

- [ ] **Step 3: 更新匹配页模板测试**

```js
assert.match(template, /ownedIngredientsText/);
assert.match(template, /suggestedPurchaseText/);
assert.match(template, /补齐并加入建议购买|一键补齐缺失食材/);
```

- [ ] **Step 4: 运行模板测试确认失败**

Run: `node scripts/test-match-page.cjs`
Expected: FAIL，提示页面尚未接入“已有 / 建议购买”文案

### Task 2: 扩展 store 维护三类食材状态

**Files:**
- Modify: `utils/store.js`
- Test: `scripts/test-procurement-split.cjs`

- [ ] **Step 1: 为建议购买新增读写接口**

```js
function getSuggestedPurchaseIngredients() {
  return readStorage(STORAGE_KEYS.suggestedPurchaseIngredients, []);
}
```

- [ ] **Step 2: 实现合并后的总食材与迁移规则**

```js
function getAllIngredientIds() {
  return unique(getSelectedIngredients().concat(getSuggestedPurchaseIngredients()));
}
```

- [ ] **Step 3: 运行采购拆分测试**

Run: `node scripts/test-procurement-split.cjs`
Expected: PASS

### Task 3: 改造首页食材篮展示

**Files:**
- Modify: `pages/home/index.js`
- Modify: `pages/home/index.wxml`
- Modify: `pages/home/index.wxss`
- Test: `scripts/test-procurement-split.cjs`

- [ ] **Step 1: 在首页刷新逻辑中拆分两类食材**

```js
const ownedIds = store.getSelectedIngredients();
const suggestedIds = store.getSuggestedPurchaseIngredients();
```

- [ ] **Step 2: 在抽屉中增加“已有食材 / 系统建议购买”两个分组**

```xml
<view class="cart-group" wx:if="{{ownedItems.length}}">
  <view class="cart-group-title">已有食材</view>
</view>
<view class="cart-group" wx:if="{{suggestedItems.length}}">
  <view class="cart-group-title">系统建议购买</view>
</view>
```

- [ ] **Step 3: 运行采购拆分测试**

Run: `node scripts/test-procurement-split.cjs`
Expected: PASS

### Task 4: 改造匹配页补齐与提交逻辑

**Files:**
- Modify: `pages/match/index.js`
- Modify: `pages/match/index.wxml`
- Modify: `pages/match/index.wxss`
- Test: `scripts/test-match-page.cjs`
- Test: `scripts/test-procurement-split.cjs`

- [ ] **Step 1: 让匹配逻辑基于总食材而不是仅已有食材**

```js
const ownedIds = store.getSelectedIngredients();
const suggestedIds = store.getSuggestedPurchaseIngredients();
const allIngredientIds = store.getAllIngredientIds();
```

- [ ] **Step 2: 将补齐行为改为加入建议购买**

```js
store.addSuggestedPurchaseIngredients(nextIds);
wx.showToast({ title: "已加入建议购买", icon: "none" });
```

- [ ] **Step 3: 提交订单时保存三套字段**

```js
owned_ingredient_ids: store.getSelectedIngredients(),
suggested_purchase_ids: store.getSuggestedPurchaseIngredients(),
all_ingredient_ids: store.getAllIngredientIds(),
```

- [ ] **Step 4: 运行页面与流程测试**

Run: `node scripts/test-match-page.cjs && node scripts/test-procurement-split.cjs`
Expected: PASS

### Task 5: 改造成功页展示

**Files:**
- Modify: `pages/checkout-success/index.js`
- Modify: `pages/checkout-success/index.wxml`
- Test: `scripts/test-procurement-split.cjs`

- [ ] **Step 1: 读取并格式化三类食材摘要**

```js
const ownedIngredientsText = order ? getIngredientsByIds(order.owned_ingredient_ids).map(...) : "";
const suggestedIngredientsText = order ? getIngredientsByIds(order.suggested_purchase_ids).map(...) : "";
```

- [ ] **Step 2: 在成功页展示“已有食材 / 系统建议购买”**

```xml
<view class="subtitle" wx:if="{{ownedIngredientsText}}">已有食材：{{ownedIngredientsText}}</view>
<view class="subtitle" wx:if="{{suggestedIngredientsText}}">系统建议购买：{{suggestedIngredientsText}}</view>
```

- [ ] **Step 3: 运行采购拆分测试**

Run: `node scripts/test-procurement-split.cjs`
Expected: PASS

### Task 6: 全量回归

**Files:**
- Test: `scripts/test-procurement-split.cjs`
- Test: `scripts/test-match-page.cjs`
- Test: `scripts/test-match-ranking.cjs`
- Test: `scripts/test-recipe-profile-enhancements.cjs`
- Test: `scripts/test-recipes-page.cjs`
- Test: `scripts/test-recipe-data.cjs`
- Test: `scripts/test-global-buttons.cjs`

- [ ] **Step 1: 运行所有相关脚本**

```bash
node scripts/test-procurement-split.cjs
node scripts/test-match-page.cjs
node scripts/test-match-ranking.cjs
node scripts/test-recipe-profile-enhancements.cjs
node scripts/test-recipes-page.cjs
node scripts/test-recipe-data.cjs
node scripts/test-global-buttons.cjs
```

- [ ] **Step 2: 修正遗漏并再次回归**

Expected: 全部 PASS
