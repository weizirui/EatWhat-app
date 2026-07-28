const store = require("../../utils/store");
const { callCloud } = require("../../utils/cloud");

/**
 * 规范用户输入的邀请码。
 * @param {unknown} value 输入值。
 * @returns {string} 最多 6 位的大写邀请码。
 */
function normalizeInviteCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

/**
 * 格式化邀请码过期时间。
 * @param {number} timestamp 毫秒时间戳。
 * @returns {string} 过期提示。
 */
function formatExpireTime(timestamp) {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `有效至 ${hours}:${minutes}`;
}

/**
 * 校验本地默认采购人是否仍在有效协作人中。
 * @param {object[]} collaborators 有效协作人列表。
 * @param {string} defaultReceiverOpenid 本地默认采购人 OpenID。
 * @returns {object} 可直接写入页面的默认采购人状态。
 */
function getDefaultReceiverState(collaborators, defaultReceiverOpenid) {
  if (!defaultReceiverOpenid) {
    return {
      defaultReceiverOpenid: "",
      defaultReceiverName: "",
    };
  }
  const matched = collaborators.find((item) => item.partnerOpenid === defaultReceiverOpenid);
  if (!matched) {
    return {
      defaultReceiverOpenid: "",
      defaultReceiverName: "",
    };
  }
  return {
    defaultReceiverOpenid,
    defaultReceiverName: matched.partnerName || "协作人",
  };
}

/**
 * 将云开发错误转换为可执行的排查提示。
 * @param {unknown} error 协作服务调用错误。
 * @param {string} functionName 当前调用的服务名。
 * @returns {string} 页面错误提示。
 */
function getCloudErrorText(error, functionName) {
  const message = String(error && (error.errMsg || error.message) || error || "");
  if (/FUNCTION_NOT_FOUND|function.*not.*found/i.test(message)) {
    console.error(`[collaboration] ${functionName} 未部署`, error);
    return "协作服务尚未启用，请联系管理员发布最新版本。";
  }
  if (/COLLECTION_NOT_EXIST|collection.*not.*exist|database collection/i.test(message)) {
    return "云数据库集合不存在，请创建 collab_invites、collaborators 和 collab_tasks。";
  }
  if (/environment|env.*not.*found|INVALID_ENV/i.test(message)) {
    return "协作环境不可用，请确认 AppID 与 cloud1-d9gyz89t28481efb1 匹配。";
  }
  return `协作服务调用失败：${message || "请稍后重试"}`;
}

Page({
  data: {
    ordersCount: 0,
    recentOrders: [],
    inviteCode: "",
    inviteCodeExpiresText: "",
    inviteCodeInput: "",
    inviteErrorText: "",
    inviteCreating: false,
    inviteRedeeming: false,
    collaborators: [],
    collaboratorsLoading: false,
    collaboratorsError: "",
    unreadTaskCount: 0,
    defaultReceiverOpenid: "",
    defaultReceiverName: "",
    collabDisplayName: "",
  },

  /**
   * 刷新本机订单和在线协作状态。
   * @returns {void}
   */
  onShow() {
    const settings = store.getSettings();
    const orders = store.getOrders();
    this.setData({
      ordersCount: orders.length,
      recentOrders: orders.slice(0, 6).map((order) => ({
        id: order.id,
        createdAt: order.created_at,
        recipeCount: (order.recipe_ids || []).length,
        ingredientCount: (order.all_ingredient_ids || order.ingredient_ids || []).length,
        summaryText: `${(order.recipe_ids || []).length} 道菜 · ${(order.all_ingredient_ids || order.ingredient_ids || []).length} 项食材`,
      })),
      defaultReceiverOpenid: settings.defaultReceiverOpenid || "",
      defaultReceiverName: "",
      collabDisplayName: settings.collabDisplayName || "",
    });
    this.loadCollaborators();
  },

  /**
   * 更新并规范邀请码输入。
   * @param {object} event 输入事件。
   * @returns {void}
   */
  updateInviteCodeInput(event) {
    this.setData({
      inviteCodeInput: normalizeInviteCode(event.detail.value),
    });
  },

  /**
   * 更新本机保存的协作昵称。
   * @param {object} event 输入事件。
   * @returns {void}
   */
  updateCollabDisplayName(event) {
    const collabDisplayName = String(event.detail.value || "").trim().slice(0, 12);
    this.setData({ collabDisplayName });
    store.updateSettings({ collabDisplayName });
  },

  /**
   * 将协作昵称同步到所有已绑定人的列表。
   * @returns {Promise<void>} 同步完成。
   */
  async saveCollabDisplayName() {
    const displayName = String(this.data.collabDisplayName || "").trim();
    if (!displayName) {
      return;
    }
    try {
      await callCloud("update_collab_profile", { displayName });
    } catch (error) {
      wx.showToast({
        title: "昵称同步失败，请稍后重试",
        icon: "none",
      });
    }
  },

  /**
   * 加载当前用户的双向协作关系和未读任务数。
   * @returns {Promise<void>} 加载完成。
   */
  async loadCollaborators() {
    this.setData({
      collaboratorsLoading: true,
      collaboratorsError: "",
    });
    try {
      const result = await callCloud("list_collaborators");
      const collaborators = result.collaborators || [];
      const defaultReceiverState = getDefaultReceiverState(
        collaborators,
        this.data.defaultReceiverOpenid,
      );
      if (this.data.defaultReceiverOpenid && !defaultReceiverState.defaultReceiverOpenid) {
        store.updateSettings({
          defaultReceiverOpenid: "",
        });
      }
      this.setData({
        collaborators,
        collaboratorsLoading: false,
        unreadTaskCount: Number(result.unreadTaskCount || 0),
        ...defaultReceiverState,
      });
    } catch (error) {
      this.setData({
        collaborators: [],
        collaboratorsLoading: false,
        collaboratorsError: getCloudErrorText(error, "list_collaborators"),
        unreadTaskCount: 0,
        defaultReceiverName: "",
      });
    }
  },

  /**
   * 创建 30 分钟有效的一次性邀请码。
   * @returns {Promise<void>} 创建完成。
   */
  async createInviteCode() {
    if (this.data.inviteCreating) {
      return;
    }
    if (!this.data.collabDisplayName) {
      wx.showToast({
        title: "先填写协作昵称",
        icon: "none",
      });
      return;
    }
    this.setData({
      inviteCreating: true,
      inviteErrorText: "",
    });
    try {
      const result = await callCloud("create_collab_invite", {
        displayName: this.data.collabDisplayName,
      });
      if (!result.ok || !result.code) {
        throw new Error(result.reason || "empty_invite_code");
      }
      this.setData({
        inviteCode: result.code || "",
        inviteCodeExpiresText: formatExpireTime(result.expiresAt),
        inviteCreating: false,
      });
      wx.showToast({
        title: "邀请码已生成",
        icon: "none",
      });
    } catch (error) {
      this.setData({
        inviteCreating: false,
        inviteErrorText: getCloudErrorText(error, "create_collab_invite"),
      });
      wx.showToast({
        title: "生成失败，请看提示",
        icon: "none",
      });
    }
  },

  /**
   * 使用邀请码建立双向协作关系。
   * @returns {Promise<void>} 绑定和列表刷新完成。
   */
  async redeemInviteCode() {
    const code = normalizeInviteCode(this.data.inviteCodeInput);
    if (!code) {
      wx.showToast({
        title: "先输入邀请码",
        icon: "none",
      });
      return;
    }
    if (code.length < 6) {
      wx.showToast({
        title: "请输入 6 位邀请码",
        icon: "none",
      });
      return;
    }
    if (!this.data.collabDisplayName) {
      wx.showToast({
        title: "先填写协作昵称",
        icon: "none",
      });
      return;
    }
    if (this.data.inviteRedeeming) {
      return;
    }
    this.setData({
      inviteRedeeming: true,
      inviteErrorText: "",
    });
    try {
      const result = await callCloud("redeem_collab_invite", {
        code,
        displayName: this.data.collabDisplayName,
      });
      if (!result.ok) {
        const reasonText = {
          invalid_code: "邀请码无效、已使用或已过期。",
          self_bind: "不能使用自己生成的邀请码。",
          already_bound: "你们已经是协作人。",
        }[result.reason] || "邀请码不可用。";
        this.setData({
          inviteRedeeming: false,
          inviteErrorText: reasonText,
        });
        wx.showToast({
          title: "邀请码不可用",
          icon: "none",
        });
        return;
      }
      this.setData({
        inviteCodeInput: "",
        inviteRedeeming: false,
      });
      wx.showToast({
        title: "协作人已绑定",
        icon: "success",
      });
      await this.loadCollaborators();
    } catch (error) {
      this.setData({
        inviteRedeeming: false,
        inviteErrorText: getCloudErrorText(error, "redeem_collab_invite"),
      });
      wx.showToast({
        title: "绑定失败，请看提示",
        icon: "none",
      });
    }
  },

  /**
   * 设置提交清单时优先通知的协作人。
   * @param {object} event 包含 openid 的点击事件。
   * @returns {void}
   */
  setDefaultReceiver(event) {
    const { openid } = event.currentTarget.dataset;
    if (!openid || openid === this.data.defaultReceiverOpenid) {
      return;
    }
    const collaborator = this.data.collaborators.find((item) => item.partnerOpenid === openid);
    this.setData({
      defaultReceiverOpenid: openid,
      defaultReceiverName: collaborator ? collaborator.partnerName || "协作人" : "",
    });
    store.updateSettings({
      defaultReceiverOpenid: openid,
    });
    wx.showToast({
      title: "已设为默认采购人",
      icon: "none",
    });
  },

  /**
   * 双向解除协作关系，保留历史采购任务。
   * @param {object} event 包含 openid 的点击事件。
   * @returns {void}
   */
  removeCollaborator(event) {
    const { openid } = event.currentTarget.dataset;
    if (!openid) {
      return;
    }
    wx.showModal({
      title: "解除协作关系",
      content: "解除后双方不能再互发新清单，历史任务仍会保留。",
      success: async (modalResult) => {
        if (!modalResult.confirm) {
          return;
        }
        try {
          const result = await callCloud("remove_collaborator", {
            partnerOpenid: openid,
          });
          if (!result.ok) {
            throw new Error(result.reason || "remove_collaborator_failed");
          }
          if (openid === this.data.defaultReceiverOpenid) {
            store.updateSettings({ defaultReceiverOpenid: "" });
          }
          wx.showToast({
            title: "已解除协作关系",
            icon: "none",
          });
          await this.loadCollaborators();
        } catch (error) {
          wx.showToast({
            title: "解除失败，请稍后重试",
            icon: "none",
          });
        }
      },
    });
  },

  /**
   * 进入协作任务列表。
   * @returns {void}
   */
  navigateToTasks() {
    wx.navigateTo({
      url: "/pages/tasks/index",
    });
  },

  /**
   * 清空本机保存的订单记录。
   * @returns {void}
   */
  clearOrders() {
    wx.showModal({
      title: "清空订单",
      content: "会移除订单记录和最近一次提交结果，确定继续吗？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        store.clearOrders();
        this.setData({
          ordersCount: 0,
          recentOrders: [],
        });
        wx.showToast({
          title: "已清空",
          icon: "success",
        });
      },
    });
  },

  /**
   * 打开本机订单详情。
   * @param {object} event 包含订单 id 的点击事件。
   * @returns {void}
   */
  openOrderDetail(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/checkout-success/index?id=${id}&source=settings`,
    });
  },
});
