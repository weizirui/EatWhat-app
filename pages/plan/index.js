const store = require("../../utils/store");
const { buildWeekPlan } = require("../../utils/week-menu");

Page({
  data: {
    days: [],
    loading: true,
  },

  onLoad() {
    this.setData({
      loading: true,
    });
    const days = buildWeekPlan(new Date()).map((day, index) => ({
      ...day,
      open: index === 0,
      addAllText: `加入全部 ${day.recipes.length} 道到采购清单`,
    }));
    this.setData({
      days,
      loading: false,
    });
  },

  toggleDay(event) {
    const { index } = event.currentTarget.dataset;
    if (index === undefined) {
      return;
    }
    const days = this.data.days.map((day, i) =>
      i === Number(index)
        ? Object.assign({}, day, { open: !day.open })
        : day,
    );
    this.setData({ days });
  },

  addDayAndGo(event) {
    const { index } = event.currentTarget.dataset;
    const day = this.data.days[Number(index)];
    if (!day) {
      return;
    }
    const recipeIds = day.recipes.map((item) => item.id);
    store.addPickedRecipes(recipeIds);
    wx.navigateTo({
      url: "/pages/match/index",
    });
  },
});
