const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

/**
 * 深拷贝测试数据，避免查询结果修改内存数据库。
 * @param {unknown} value 原始值。
 * @returns {unknown} 独立副本。
 */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 判断文档是否满足简化版云数据库查询条件。
 * @param {object} item 数据库文档。
 * @param {object} filters where 条件。
 * @returns {boolean} 是否匹配。
 */
function matches(item, filters) {
  return Object.entries(filters || {}).every(([key, expected]) => {
    if (expected && typeof expected === "object" && Object.hasOwn(expected, "$gt")) {
      return item[key] > expected.$gt;
    }
    return item[key] === expected;
  });
}

/**
 * 创建支持当前协作云函数所需能力的内存数据库。
 * @returns {object} 云数据库测试替身。
 */
function createMemoryDatabase() {
  const data = Object.create(null);
  let sequence = 0;

  function rows(name) {
    if (!data[name]) {
      data[name] = [];
    }
    return data[name];
  }

  function createQuery(name, filters) {
    let limitCount = Infinity;
    let orderField = "";
    let orderDirection = "asc";
    return {
      orderBy(field, direction) {
        orderField = field;
        orderDirection = direction;
        return this;
      },
      limit(count) {
        limitCount = count;
        return this;
      },
      async get() {
        let result = rows(name).filter((item) => matches(item, filters));
        if (orderField) {
          const factor = orderDirection === "desc" ? -1 : 1;
          result = result.slice().sort((left, right) => (left[orderField] - right[orderField]) * factor);
        }
        return { data: clone(result.slice(0, limitCount)) };
      },
      async count() {
        return { total: rows(name).filter((item) => matches(item, filters)).length };
      },
      async update(payload) {
        let updated = 0;
        rows(name).forEach((item) => {
          if (!matches(item, filters)) {
            return;
          }
          Object.assign(item, clone(payload.data || {}));
          updated += 1;
        });
        return { stats: { updated } };
      },
    };
  }

  const database = {
    command: {
      gt(value) {
        return { $gt: value };
      },
    },
    async runTransaction(callback) {
      return callback(database);
    },
    collection(name) {
      return {
        async add(payload) {
          sequence += 1;
          const item = Object.assign({ _id: `${name}-${sequence}` }, clone(payload.data || {}));
          rows(name).push(item);
          return { _id: item._id };
        },
        where(filters) {
          return createQuery(name, filters);
        },
        doc(id) {
          return {
            async get() {
              return { data: clone(rows(name).find((entry) => entry._id === id) || null) };
            },
            async update(payload) {
              const item = rows(name).find((entry) => entry._id === id);
              if (!item) {
                return { stats: { updated: 0 } };
              }
              Object.assign(item, clone(payload.data || {}));
              return { stats: { updated: 1 } };
            },
          };
        },
      };
    },
    inspect(name) {
      return clone(rows(name));
    },
  };
  return database;
}

/**
 * 以指定用户身份执行真实云函数代码。
 * @param {string} functionName 云函数目录名。
 * @param {string} openid 当前用户 OpenID。
 * @param {object} event 调用参数。
 * @param {object} database 共享内存数据库。
 * @returns {Promise<object>} 云函数执行结果。
 */
async function callFunction(functionName, openid, event, database) {
  const filePath = path.join(root, "cloudfunctions", functionName, "index.js");
  const code = fs.readFileSync(filePath, "utf8");
  const module = { exports: {} };
  const cloud = {
    DYNAMIC_CURRENT_ENV: "test-env",
    init() {},
    database() {
      return database;
    },
    getWXContext() {
      return { OPENID: openid };
    },
  };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(request) {
      if (request === "wx-server-sdk") {
        return cloud;
      }
      throw new Error(`unexpected require: ${request}`);
    },
    console,
    Date,
    Math,
    Promise,
    Set,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Error,
  }, { filename: filePath });
  return module.exports.main(event || {});
}

(async () => {
  const db = createMemoryDatabase();

  const inviteAB = await callFunction("create_collab_invite", "user-a", { displayName: "小王" }, db);
  assert.equal(inviteAB.ok, true);
  assert.equal(inviteAB.code.length, 6);

  const bindAB = await callFunction("redeem_collab_invite", "user-b", {
    code: inviteAB.code,
    displayName: "小李",
  }, db);
  assert.equal(bindAB.ok, true);

  const reusedInvite = await callFunction("redeem_collab_invite", "user-c", {
    code: inviteAB.code,
  }, db);
  assert.equal(reusedInvite.ok, false);
  assert.equal(reusedInvite.reason, "invalid_code");

  const raceDb = createMemoryDatabase();
  const raceInvite = await callFunction("create_collab_invite", "user-x", {
    displayName: "发起人",
  }, raceDb);
  const raceResults = await Promise.all([
    callFunction("redeem_collab_invite", "user-y", {
      code: raceInvite.code,
      displayName: "甲",
    }, raceDb),
    callFunction("redeem_collab_invite", "user-z", {
      code: raceInvite.code,
      displayName: "乙",
    }, raceDb),
  ]);
  assert.equal(raceResults.filter((item) => item.ok).length, 1);
  assert.equal(raceResults.filter((item) => item.reason === "invalid_code").length, 1);
  assert.equal(raceDb.inspect("collaborators").filter((item) => item.status === "active").length, 2);

  const inviteAC = await callFunction("create_collab_invite", "user-a", { displayName: "小王" }, db);
  const bindAC = await callFunction("redeem_collab_invite", "user-c", {
    code: inviteAC.code,
    displayName: "小周",
  }, db);
  assert.equal(bindAC.ok, true);

  const listA = await callFunction("list_collaborators", "user-a", {}, db);
  const listB = await callFunction("list_collaborators", "user-b", {}, db);
  assert.deepEqual(listA.collaborators.map((item) => item.partnerOpenid).sort(), ["user-b", "user-c"]);
  assert.deepEqual(listB.collaborators.map((item) => item.partnerOpenid), ["user-a"]);

  const profileUpdate = await callFunction("update_collab_profile", "user-b", {
    displayName: "李师傅",
  }, db);
  assert.equal(profileUpdate.ok, true);
  const listAAfterProfile = await callFunction("list_collaborators", "user-a", {}, db);
  assert.equal(
    listAAfterProfile.collaborators.find((item) => item.partnerOpenid === "user-b").partnerName,
    "李师傅",
  );

  const directTask = await callFunction("submit_collab_order", "user-a", {
    orderId: "order-direct",
    receiverOpenid: "user-b",
    recipeIds: ["smashed-cucumber"],
    ingredientIds: ["cucumber", "garlic"],
    recipeNames: ["拍黄瓜"],
    ingredientNames: ["黄瓜", "蒜"],
  }, db);
  assert.equal(directTask.recipientCount, 1);
  const duplicateDirectTask = await callFunction("submit_collab_order", "user-a", {
    orderId: "order-direct",
    receiverOpenid: "user-b",
    recipeIds: ["smashed-cucumber"],
  }, db);
  assert.equal(duplicateDirectTask.ok, true);
  assert.equal(duplicateDirectTask.deduplicated, true);
  assert.equal(duplicateDirectTask.recipientCount, 1);

  const unreadB = await callFunction("list_collaborators", "user-b", {}, db);
  const unreadC = await callFunction("list_collaborators", "user-c", {}, db);
  assert.equal(unreadB.unreadTaskCount, 1);
  assert.equal(unreadC.unreadTaskCount, 0);

  const tasksB = await callFunction("list_collab_tasks", "user-b", {}, db);
  assert.equal(tasksB.receivedTasks.length, 1);
  assert.equal(tasksB.receivedTasks[0].unread, true);
  assert.deepEqual(Array.from(tasksB.receivedTasks[0].peerNames), ["小王"]);
  const readB = await callFunction("list_collaborators", "user-b", {}, db);
  assert.equal(readB.unreadTaskCount, 0);

  const startedTask = await callFunction("update_collab_task_status", "user-b", {
    taskId: tasksB.receivedTasks[0].id,
    status: "purchasing",
  }, db);
  assert.equal(startedTask.ok, true);
  const sentAfterStart = await callFunction("list_collab_tasks", "user-a", {}, db);
  assert.equal(sentAfterStart.sentTasks.find((item) => item.orderId === "order-direct").status, "purchasing");

  const completedTask = await callFunction("update_collab_task_status", "user-b", {
    taskId: tasksB.receivedTasks[0].id,
    status: "completed",
  }, db);
  assert.equal(completedTask.ok, true);
  const invalidTransition = await callFunction("update_collab_task_status", "user-b", {
    taskId: tasksB.receivedTasks[0].id,
    status: "purchasing",
  }, db);
  assert.equal(invalidTransition.ok, false);
  assert.equal(invalidTransition.reason, "invalid_status_transition");

  const broadcastTask = await callFunction("submit_collab_order", "user-a", {
    orderId: "order-all",
    recipeIds: ["tomato-eggs"],
    ingredientIds: ["tomato", "egg"],
    recipeNames: ["番茄炒蛋"],
    ingredientNames: ["番茄", "鸡蛋"],
  }, db);
  assert.equal(broadcastTask.recipientCount, 0);

  const assignedTask = await callFunction("submit_collab_order", "user-a", {
    orderId: "order-c",
    receiverOpenid: "user-c",
    recipeIds: ["tomato-eggs"],
  }, db);
  assert.equal(assignedTask.recipientCount, 1);

  const removed = await callFunction("remove_collaborator", "user-b", {
    partnerOpenid: "user-a",
  }, db);
  assert.equal(removed.ok, true);
  assert.equal((await callFunction("list_collaborators", "user-b", {}, db)).collaborators.length, 0);
  assert.deepEqual(
    (await callFunction("list_collaborators", "user-a", {}, db)).collaborators.map((item) => item.partnerOpenid),
    ["user-c"],
  );

  const invalidReceiver = await callFunction("submit_collab_order", "user-a", {
    orderId: "order-removed-user",
    receiverOpenid: "user-b",
    recipeIds: ["tomato-eggs"],
  }, db);
  assert.equal(invalidReceiver.ok, false);
  assert.equal(invalidReceiver.reason, "invalid_receiver");

  const activeOnlyTask = await callFunction("submit_collab_order", "user-a", {
    orderId: "order-active-only",
    receiverOpenid: "user-c",
    recipeIds: ["tomato-eggs"],
  }, db);
  assert.equal(activeOnlyTask.recipientCount, 1);

  const activeRows = db.inspect("collaborators").filter((item) => item.status === "active");
  assert.equal(activeRows.length, 2);
  console.log("collaboration end-to-end flow tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
