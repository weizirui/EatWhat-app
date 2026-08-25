const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const template = fs.readFileSync(path.join(root, "pages/settings/index.wxml"), "utf8");
const script = fs.readFileSync(path.join(root, "pages/settings/index.js"), "utf8");

assert.doesNotMatch(template, /协作人管理/);
assert.doesNotMatch(template, /生成邀请码/);
assert.doesNotMatch(template, /输入邀请码/);
assert.doesNotMatch(template, /默认采购人/);
assert.doesNotMatch(template, /wx:for="\{\{collaborators\}\}"/);
assert.doesNotMatch(template, /设为默认/);
assert.doesNotMatch(template, /removeCollaborator/);
assert.doesNotMatch(template, /unreadTaskCount/);
assert.doesNotMatch(template, /我的协作昵称/);
assert.doesNotMatch(template, /updateCollabDisplayName/);
assert.doesNotMatch(template, /!collaboratorsLoading && collaboratorsError/);
assert.doesNotMatch(template, /!collaboratorsLoading && !collaboratorsError && !collaborators\.length/);
assert.doesNotMatch(template, /wx:else-if="\{\{!collaborators\.length\}\}"/);
assert.doesNotMatch(template, /bindtap="loadCollaborators"/);
assert.match(script, /create_collab_invite/);
assert.match(script, /redeem_collab_invite/);
assert.match(script, /list_collaborators/);
assert.match(script, /remove_collaborator/);
assert.match(script, /normalizeInviteCode/);
assert.match(script, /collaboratorsLoading/);

function loadSettingsPage(deps) {
  const filePath = path.join(root, "pages/settings/index.js");
  const code = fs.readFileSync(filePath, "utf8");
  let pageConfig = null;
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require(request) {
      if (request === "../../utils/store") {
        return deps.store;
      }
      if (request === "../../utils/cloud") {
        return {
          callCloud: deps.callCloud,
        };
      }
      if (request === "../../utils/format") {
        return {
          formatOrderTitle() {
            return "7月9日 12:30 菜单";
          },
        };
      }
      throw new Error(`unexpected require: ${request}`);
    },
    Page(config) {
      pageConfig = config;
    },
    wx: deps.wx,
    console,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(code, context, { filename: filePath });
  return pageConfig;
}

function createPage(pageConfig) {
  const page = {
    data: JSON.parse(JSON.stringify(pageConfig.data)),
    setData(patch) {
      Object.assign(this.data, patch);
    },
  };
  Object.entries(pageConfig).forEach(([key, value]) => {
    if (key !== "data") {
      page[key] = value;
    }
  });
  return page;
}

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

(async () => {
  const storeCalls = [];
  const toastCalls = [];
  const cloudCalls = [];
  const store = {
    isSetupCompleted() {
      return true;
    },
    getSettings() {
      return {
        contactName: "张阿姨",
        defaultRemark: "",
        mealTimeOffset: 30,
        defaultReceiverOpenid: "stale-user",
      };
    },
    getOrders() {
      return [{ id: "order-1" }];
    },
    updateSettings(patch) {
      storeCalls.push(patch);
      return patch;
    },
  };
  const cloudQueue = [
    {
      unreadTaskCount: 2,
      collaborators: [
        {
          partnerOpenid: "user-b",
          partnerName: "李阿姨",
        },
      ],
    },
    {
      ok: true,
      code: "AB12CD",
      expiresAt: new Date("2026-07-09T12:30:00+08:00").getTime(),
    },
    {
      ok: true,
    },
    {
      collaborators: [
        {
          partnerOpenid: "user-b",
          partnerName: "李阿姨",
        },
      ],
    },
  ];
  async function callCloud(name, data) {
    cloudCalls.push({ name, data });
    const next = cloudQueue.shift();
    if (!next) {
      throw new Error("unexpected cloud call");
    }
    return next;
  }
  const wx = {
    showToast(payload) {
      toastCalls.push(payload);
    },
    navigateTo() {},
    showModal() {},
  };

  const pageConfig = loadSettingsPage({ store, callCloud, wx });
  const page = createPage(pageConfig);

  page.setData({
    defaultReceiverOpenid: "stale-user",
    collabDisplayName: "小王",
  });
  await page.loadCollaborators();
  assert.equal(page.data.collaboratorsLoading, false);
  assert.equal(page.data.collaborators.length, 1);
  assert.equal(page.data.unreadTaskCount, undefined);
  assert.equal(page.data.defaultReceiverOpenid, "");
  assert.equal(page.data.defaultReceiverName, "");
  assert.deepEqual(toPlainObject(storeCalls[0]), { defaultReceiverOpenid: "" });

  page.updateInviteCodeInput({
    detail: {
      value: " a-b12c34 ",
    },
  });
  assert.equal(page.data.inviteCodeInput, "AB12C3");

  await page.createInviteCode();
  assert.equal(page.data.inviteCode, "AB12CD");
  assert.match(page.data.inviteCodeExpiresText, /有效至 12:30/);

  page.setData({
    inviteCodeInput: "ab12cd",
  });
  await page.redeemInviteCode();
  assert.equal(page.data.inviteCodeInput, "");
  assert.equal(cloudCalls[2].name, "redeem_collab_invite");
  assert.deepEqual(toPlainObject(cloudCalls[2].data), {
    code: "AB12CD",
    displayName: "小王",
  });

  page.setDefaultReceiver({
    currentTarget: {
      dataset: {
        openid: "user-b",
      },
    },
  });
  assert.equal(page.data.defaultReceiverOpenid, "user-b");
  assert.equal(page.data.defaultReceiverName, "李阿姨");
  assert.deepEqual(toPlainObject(storeCalls[storeCalls.length - 1]), { defaultReceiverOpenid: "user-b" });
  assert.equal(toastCalls.some((item) => item.title === "已设为默认采购人"), true);

  console.log("collaboration page tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
