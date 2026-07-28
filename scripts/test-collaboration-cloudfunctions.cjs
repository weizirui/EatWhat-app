const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readCloudFile(relativePath) {
  const filePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} should exist`);
  return fs.readFileSync(filePath, "utf8");
}

const createInviteCode = readCloudFile("cloudfunctions/create_collab_invite/index.js");
assert.match(createInviteCode, /getWXContext/);
assert.match(createInviteCode, /collab_invites/);
assert.match(createInviteCode, /code/);

const redeemInviteCode = readCloudFile("cloudfunctions/redeem_collab_invite/index.js");
assert.match(redeemInviteCode, /getWXContext/);
assert.match(redeemInviteCode, /collaborators/);
assert.match(redeemInviteCode, /used/);
assert.match(redeemInviteCode, /runTransaction/);
assert.match(redeemInviteCode, /claimResult/);

const listCollaborators = readCloudFile("cloudfunctions/list_collaborators/index.js");
assert.match(listCollaborators, /getWXContext/);
assert.match(listCollaborators, /collaborators/);
assert.match(listCollaborators, /user_openid/);
assert.match(listCollaborators, /collab_tasks/);
assert.match(listCollaborators, /unreadTaskCount/);

const submitOrder = readCloudFile("cloudfunctions/submit_collab_order/index.js");
assert.match(submitOrder, /collab_tasks/);
assert.match(submitOrder, /direction:\s*"sent"/);
assert.match(submitOrder, /direction:\s*"received"/);
assert.match(submitOrder, /unread:\s*true/);
assert.match(submitOrder, /getSenderDisplayName/);
assert.match(submitOrder, /deduplicated/);

const listTasks = readCloudFile("cloudfunctions/list_collab_tasks/index.js");
assert.match(listTasks, /receivedTasks/);
assert.match(listTasks, /sentTasks/);
assert.match(listTasks, /unread:\s*false/);

const removeCollaborator = readCloudFile("cloudfunctions/remove_collaborator/index.js");
assert.match(removeCollaborator, /status:\s*"removed"/);
assert.match(removeCollaborator, /partner_openid:\s*OPENID/);

const updateTaskStatus = readCloudFile("cloudfunctions/update_collab_task_status/index.js");
assert.match(updateTaskStatus, /invalid_status_transition/);
assert.match(updateTaskStatus, /direction !== "received"/);
assert.match(updateTaskStatus, /status_updated_by/);

const updateProfile = readCloudFile("cloudfunctions/update_collab_profile/index.js");
assert.match(updateProfile, /partner_openid:\s*OPENID/);
assert.match(updateProfile, /partner_name:\s*displayName/);

console.log("collaboration cloudfunctions tests passed");
