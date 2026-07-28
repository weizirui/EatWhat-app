const { callCloud } = require("../../utils/cloud");

const STATUS_TEXT = {
  pending: "待采购",
  purchasing: "采购中",
  completed: "已完成",
};

/**
 * 格式化任务创建时间。
 * @param {number} timestamp 毫秒时间戳。
 * @returns {string} 用户可读时间。
 */
function formatTaskTime(timestamp) {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 转换云端任务为页面展示结构。
 * @param {object} task 协作服务返回的任务。
 * @returns {object} 页面任务卡片数据。
 */
function formatTask(task) {
  const peerNames = Array.isArray(task.peerNames) ? task.peerNames.filter(Boolean) : [];
  const recipeNames = Array.isArray(task.recipeNames) ? task.recipeNames.filter(Boolean) : [];
  const ingredientNames = Array.isArray(task.ingredientNames) ? task.ingredientNames.filter(Boolean) : [];
  return Object.assign({}, task, {
    peerText: task.direction === "received"
      ? `来自 ${peerNames.join("、") || "协作人"}`
      : `发送给 ${peerNames.join("、") || "暂无协作人"}`,
    recipeText: recipeNames.join("、") || "未记录菜谱",
    ingredientText: ingredientNames.join("、") || "未记录食材",
    statusText: STATUS_TEXT[task.status] || "待采购",
    actionText: task.direction === "received" && task.status === "pending"
      ? "开始采购"
      : (task.direction === "received" && task.status === "purchasing" ? "完成采购" : ""),
    nextStatus: task.status === "pending" ? "purchasing" : "completed",
    createdAtText: formatTaskTime(task.createdAt),
  });
}

Page({
  data: {
    activeTab: "received",
    loading: false,
    errorText: "",
    receivedTasks: [],
    sentTasks: [],
    displayTasks: [],
    updatingTaskId: "",
  },

  /**
   * 每次进入页面刷新任务，确保协作人看到最新清单。
   * @returns {void}
   */
  onShow() {
    this.loadTasks();
  },

  /**
   * 查询当前用户收到和发出的采购任务。
   * @returns {Promise<void>} 页面状态更新完成。
   */
  async loadTasks() {
    this.setData({
      loading: true,
      errorText: "",
    });
    try {
      const result = await callCloud("list_collab_tasks");
      if (!result.ok) {
        throw new Error(result.reason || "list_collab_tasks_failed");
      }
      const receivedTasks = (result.receivedTasks || []).map(formatTask);
      const sentTasks = (result.sentTasks || []).map(formatTask);
      this.setData({
        loading: false,
        receivedTasks,
        sentTasks,
        displayTasks: this.data.activeTab === "received" ? receivedTasks : sentTasks,
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorText: "采购任务暂时无法加载，请稍后再试",
        receivedTasks: [],
        sentTasks: [],
        displayTasks: [],
      });
    }
  },

  /**
   * 切换收到或发出的任务列表。
   * @param {object} event 包含 tab 的点击事件。
   * @returns {void}
   */
  setTab(event) {
    const { tab } = event.currentTarget.dataset;
    if (!tab || tab === this.data.activeTab) {
      return;
    }
    this.setData({
      activeTab: tab,
      displayTasks: tab === "received" ? this.data.receivedTasks : this.data.sentTasks,
    });
  },

  /**
   * 推进收到的采购任务状态并刷新双方可见进度。
   * @param {object} event 包含任务 id 和下一状态。
   * @returns {Promise<void>} 状态更新和列表刷新完成。
   */
  async updateTaskStatus(event) {
    const { id, status } = event.currentTarget.dataset;
    if (!id || !status || this.data.updatingTaskId) {
      return;
    }
    this.setData({ updatingTaskId: id });
    try {
      const result = await callCloud("update_collab_task_status", {
        taskId: id,
        status,
      });
      if (!result.ok) {
        throw new Error(result.reason || "update_collab_task_status_failed");
      }
      wx.showToast({
        title: status === "completed" ? "采购已完成" : "已开始采购",
        icon: "none",
      });
      await this.loadTasks();
    } catch (error) {
      wx.showToast({
        title: "状态更新失败，请重试",
        icon: "none",
      });
    } finally {
      this.setData({ updatingTaskId: "" });
    }
  },
});
