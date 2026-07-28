# 协作采购与互相指派 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户通过邀请码绑定协作人，并在提交订单时把采购任务直接指派给任意已绑定的人，对方立刻在自己的小程序里看到待采购任务。

**Architecture:** 小程序端负责协作人管理入口、提交前选择采购人、任务列表展示；云端函数负责基于 openid 生成邀请码、完成绑定、创建采购任务、查询任务，并在条件允许时发送提醒。任务主链路以云端任务数据为准，微信消息只做提醒。

**Tech Stack:** 微信小程序原生、微信云开发、云函数、Node 脚本测试

---

## 文件范围
- Modify: `app.json`
- Modify: `app.js`
- Modify: `utils/store.js`
- Modify: `pages/settings/index.js`
- Modify: `pages/settings/index.wxml`
- Modify: `pages/settings/index.wxss`
- Modify: `pages/match/index.js`
- Modify: `pages/match/index.wxml`
- Modify: `pages/checkout-success/index.js`
- Modify: `pages/checkout-success/index.wxml`
- Create: `utils/cloud.js`
- Create: `pages/tasks/index.js`
- Create: `pages/tasks/index.wxml`
- Create: `pages/tasks/index.wxss`
- Create: `cloudfunctions/create_collab_invite/index.js`
- Create: `cloudfunctions/create_collab_invite/package.json`
- Create: `cloudfunctions/redeem_collab_invite/index.js`
- Create: `cloudfunctions/redeem_collab_invite/package.json`
- Create: `cloudfunctions/list_collaborators/index.js`
- Create: `cloudfunctions/list_collaborators/package.json`
- Create: `cloudfunctions/create_procurement_task/index.js`
- Create: `cloudfunctions/create_procurement_task/package.json`
- Create: `cloudfunctions/list_procurement_tasks/index.js`
- Create: `cloudfunctions/list_procurement_tasks/package.json`
- Create: `scripts/test-collaboration-page.cjs`
- Create: `scripts/test-procurement-task-page.cjs`
- Create: `scripts/test-collaboration-cloudfunctions.cjs`

---

### Task 1: 补测试，锁定页面入口和基础结构
**Files:**
- Create: `scripts/test-collaboration-page.cjs`
- Create: `scripts/test-procurement-task-page.cjs`
- Modify: `app.json`

- [ ] **Step 1: 写失败测试**
  - `test-collaboration-page.cjs` 断言设置页出现“协作人管理 / 生成邀请码 / 输入邀请码 / 默认采购人”
  - `test-procurement-task-page.cjs` 断言存在 `pages/tasks/index` 页面与“我收到的 / 我发出的”

- [ ] **Step 2: 运行测试确认失败**
  - Run: `node scripts/test-collaboration-page.cjs`
  - Run: `node scripts/test-procurement-task-page.cjs`

- [ ] **Step 3: 最小实现**
  - 在 `app.json` 注册 `pages/tasks/index`
  - 先创建任务页壳子和设置页占位入口，让测试转绿

- [ ] **Step 4: 再跑测试确认通过**

---

### Task 2: 扩展本地设置，容纳协作默认采购人
**Files:**
- Modify: `utils/store.js`
- Create: `scripts/test-collaboration-store.cjs`

- [ ] **Step 1: 写失败测试**
  - 断言 `settings` 中可以保存/读取 `defaultReceiverOpenid`

- [ ] **Step 2: 跑测试确认失败**
  - Run: `node scripts/test-collaboration-store.cjs`

- [ ] **Step 3: 最小实现**
  - 在 `DEFAULT_SETTINGS` 中加 `defaultReceiverOpenid`
  - 保持 `getSettings/updateSettings` 兼容旧数据

- [ ] **Step 4: 再跑测试确认通过**

---

### Task 3: 接入云端协作函数
**Files:**
- Create: `utils/cloud.js`
- Create: `cloudfunctions/create_collab_invite/index.js`
- Create: `cloudfunctions/create_collab_invite/package.json`
- Create: `cloudfunctions/redeem_collab_invite/index.js`
- Create: `cloudfunctions/redeem_collab_invite/package.json`
- Create: `cloudfunctions/list_collaborators/index.js`
- Create: `cloudfunctions/list_collaborators/package.json`
- Create: `scripts/test-collaboration-cloudfunctions.cjs`

- [ ] **Step 1: 写失败测试**
  - 断言三个云函数存在并包含 `cloud.getWXContext()`、邀请码字段、双向关系写入关键词

- [ ] **Step 2: 跑测试确认失败**
  - Run: `node scripts/test-collaboration-cloudfunctions.cjs`

- [ ] **Step 3: 最小实现**
  - `create_collab_invite`：生成 6 位邀请码 + 过期时间
  - `redeem_collab_invite`：校验邀请码、避免自绑、避免重复绑定、写入双向关系
  - `list_collaborators`：返回当前用户可见的协作人列表
  - `utils/cloud.js`：封装 `callCloud(name, data)`，统一兜底错误

- [ ] **Step 4: 再跑测试确认通过**

---

### Task 4: 做设置页里的协作人管理
**Files:**
- Modify: `pages/settings/index.js`
- Modify: `pages/settings/index.wxml`
- Modify: `pages/settings/index.wxss`
- Modify: `scripts/test-collaboration-page.cjs`

- [ ] **Step 1: 写失败测试**
  - 断言设置页模板包含：协作人管理区、生成邀请码按钮、邀请码输入框、协作人列表、默认采购人标记

- [ ] **Step 2: 跑测试确认失败**
  - Run: `node scripts/test-collaboration-page.cjs`

- [ ] **Step 3: 最小实现**
  - 页面加载时调用 `list_collaborators`
  - 按钮生成邀请码并展示
  - 输入邀请码并兑换
  - 协作人列表支持设为默认采购人

- [ ] **Step 4: 再跑测试确认通过**

---

### Task 5: 做采购任务页
**Files:**
- Create: `pages/tasks/index.js`
- Create: `pages/tasks/index.wxml`
- Create: `pages/tasks/index.wxss`
- Create: `cloudfunctions/list_procurement_tasks/index.js`
- Create: `cloudfunctions/list_procurement_tasks/package.json`
- Modify: `scripts/test-procurement-task-page.cjs`

- [ ] **Step 1: 写失败测试**
  - 断言任务页模板包含“我收到的 / 我发出的 / 待采购 / 采购中 / 已完成”
  - 断言云函数 `list_procurement_tasks` 存在

- [ ] **Step 2: 跑测试确认失败**
  - Run: `node scripts/test-procurement-task-page.cjs`

- [ ] **Step 3: 最小实现**
  - 任务页默认展示“我收到的”
  - 云函数按当前 openid 返回 `receivedTasks` 与 `sentTasks`
  - 任务卡片展示发起人、接收人、菜谱、建议购买、状态

- [ ] **Step 4: 再跑测试确认通过**

---

### Task 6: 提交前选择采购人，并创建采购任务
**Files:**
- Modify: `pages/match/index.js`
- Modify: `pages/match/index.wxml`
- Create: `cloudfunctions/create_procurement_task/index.js`
- Create: `cloudfunctions/create_procurement_task/package.json`
- Modify: `scripts/test-match-kf-send.cjs`
- Create: `scripts/test-task-assignment-flow.cjs`

- [ ] **Step 1: 写失败测试**
  - 断言匹配页脚本存在“选择采购人 / create_procurement_task / defaultReceiverOpenid / 发给自己”

- [ ] **Step 2: 跑测试确认失败**
  - Run: `node scripts/test-task-assignment-flow.cjs`

- [ ] **Step 3: 最小实现**
  - 提交前读取协作人列表
  - 用 `wx.showActionSheet` 让用户在“发给自己 / 默认采购人 / 其他协作人”中选择
  - 保存本地订单后，调用 `create_procurement_task`
  - 云端任务函数写入任务记录，并尽量复用现有客服消息能力提醒接收人

- [ ] **Step 4: 再跑测试确认通过**

---

### Task 7: 成功页和入口收口
**Files:**
- Modify: `pages/checkout-success/index.js`
- Modify: `pages/checkout-success/index.wxml`
- Modify: `pages/settings/index.wxml`

- [ ] **Step 1: 写失败测试**
  - 断言成功页可显示“本次发给谁”
  - 断言设置页有进入任务页的入口

- [ ] **Step 2: 跑测试确认失败**

- [ ] **Step 3: 最小实现**
  - 成功页显示接收人名称
  - 设置页增加“查看采购任务”入口

- [ ] **Step 4: 再跑测试确认通过**

---

### Task 8: 全量回归
**Files:**
- Test only

- [ ] **Step 1: 跑新增脚本**
  - `node scripts/test-collaboration-page.cjs`
  - `node scripts/test-procurement-task-page.cjs`
  - `node scripts/test-collaboration-cloudfunctions.cjs`
  - `node scripts/test-collaboration-store.cjs`
  - `node scripts/test-task-assignment-flow.cjs`

- [ ] **Step 2: 跑既有回归**
  - `node scripts/test-copywriting.cjs`
  - `node scripts/test-match-page.cjs`
  - `node scripts/test-match-ranking.cjs`
  - `node scripts/test-procurement-split.cjs`
  - `node scripts/test-recipes-order-fallback.cjs`
  - `node scripts/test-cloud-init.cjs`
  - `node scripts/test-kf-cloudfunction.cjs`

- [ ] **Step 3: 真机检查**
  - A 生成邀请码
  - B 输入邀请码完成绑定
  - A 提交并指派给 B
  - B 在任务页看到待采购
  - 若消息条件满足，B 同时收到提醒

