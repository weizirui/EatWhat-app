# Recipe Nutrition Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为菜谱补充分开展示的热量与蛋白、食材替换方案、以及按相关性生成的特殊身体状态调整建议。

**Architecture:** 继续以 `utils/recipe-profile.js` 为统一资料组装层，新增营养、替换方案、状态建议输出，再由 `pages/recipes` 和 `pages/match` 分别消费完整版与精简版资料。少量强语义建议放在 `data/recipes.js`，其余通过规则推导，避免大量重复手写数据。

**Tech Stack:** 微信小程序、CommonJS、WXML、WXSS、Node.js 脚本断言测试

---

### Task 1: 先写失败测试锁定新资料结构

**Files:**
- Create: `scripts/test-recipe-profile-enhancements.cjs`
- Modify: `scripts/test-recipes-page.cjs`
- Modify: `scripts/test-match-page.cjs`

- [ ] **Step 1: 写失败测试**

```js
assert.match(profile.caloriesText, /kcal/);
assert.match(profile.proteinText, /蛋白/);
assert.ok(profile.nutritionCards.length >= 2);
assert.ok(profile.swapLines.length >= 1);
assert.ok(profile.conditionAdvice.length >= 1 && profile.conditionAdvice.length <= 2);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node scripts/test-recipe-profile-enhancements.cjs`
Expected: FAIL，提示 `proteinText`、`swapLines` 或 `conditionAdvice` 缺失

- [ ] **Step 3: 更新页面模板测试**

```js
assert.match(template, /item\.proteinText/);
assert.match(template, /item\.swapLines/);
assert.match(template, /item\.conditionAdvice/);
assert.match(template, /activePickedDetail\.proteinText/);
```

- [ ] **Step 4: 运行模板测试确认失败**

Run: `node scripts/test-recipes-page.cjs && node scripts/test-match-page.cjs`
Expected: FAIL，提示模板尚未接入新字段

### Task 2: 扩展 recipe-profile 输出

**Files:**
- Modify: `utils/recipe-profile.js`
- Modify: `data/recipes.js`
- Test: `scripts/test-recipe-profile-enhancements.cjs`

- [ ] **Step 1: 为典型菜谱补少量结构化提示**

```js
swap_options: [
  { from: "五花肉", to: "鸡胸肉", reason: "想更清爽时可替换" },
],
condition_hints: [
  { key: "控糖", text: "少糖或不额外勾芡，主食减半更稳妥" },
],
```

- [ ] **Step 2: 最小实现蛋白、替换建议、状态建议生成**

```js
return {
  caloriesText: `约 ${calories} kcal / 份`,
  proteinText: `约 ${protein}g 蛋白 / 份`,
  nutritionCards,
  swapLines,
  conditionAdvice,
  conditionTags,
  ...
};
```

- [ ] **Step 3: 运行资料层测试**

Run: `node scripts/test-recipe-profile-enhancements.cjs`
Expected: PASS

### Task 3: 接入完整做法页

**Files:**
- Modify: `pages/recipes/index.js`
- Modify: `pages/recipes/index.wxml`
- Modify: `pages/recipes/index.wxss`
- Test: `scripts/test-recipes-page.cjs`

- [ ] **Step 1: 在序列化阶段带出新增资料**

```js
proteinText: profile.proteinText,
nutritionCards: profile.nutritionCards,
swapLines: profile.swapLines,
conditionAdvice: profile.conditionAdvice,
```

- [ ] **Step 2: 在完整做法页增加两个区块**

```xml
<view class="detail-block" wx:if="{{item.swapLines.length}}">
  <view class="detail-title">食材替换方案</view>
</view>
<view class="detail-block" wx:if="{{item.conditionAdvice.length}}">
  <view class="detail-title">特殊身体状态调整建议</view>
</view>
```

- [ ] **Step 3: 跑页面测试**

Run: `node scripts/test-recipes-page.cjs`
Expected: PASS

### Task 4: 接入匹配页抽屉精简展示

**Files:**
- Modify: `pages/match/index.js`
- Modify: `pages/match/index.wxml`
- Modify: `pages/match/index.wxss`
- Test: `scripts/test-match-page.cjs`

- [ ] **Step 1: 在抽屉详情里带出精简字段**

```js
proteinText: profile.proteinText,
swapLines: profile.swapLines.slice(0, 2),
conditionAdvice: profile.conditionAdvice.slice(0, 2),
```

- [ ] **Step 2: 在抽屉模板里增加营养与建议摘要**

```xml
<view class="picked-meta-sub">{{activePickedDetail.caloriesText}} · {{activePickedDetail.proteinText}}</view>
<view class="picked-section" wx:if="{{activePickedDetail.swapLines.length}}">
```

- [ ] **Step 3: 跑页面测试**

Run: `node scripts/test-match-page.cjs`
Expected: PASS

### Task 5: 全量回归

**Files:**
- Test: `scripts/test-global-buttons.cjs`
- Test: `scripts/test-recipe-data.cjs`
- Test: `scripts/test-recipe-profile-enhancements.cjs`
- Test: `scripts/test-recipes-page.cjs`
- Test: `scripts/test-match-page.cjs`

- [ ] **Step 1: 运行所有相关脚本**

```bash
node scripts/test-global-buttons.cjs
node scripts/test-recipe-data.cjs
node scripts/test-recipe-profile-enhancements.cjs
node scripts/test-recipes-page.cjs
node scripts/test-match-page.cjs
```

- [ ] **Step 2: 修正样式或字段遗漏后再次回归**

Expected: 全部 PASS
