const store = require("../../utils/store");
const { buildWeekPlan } = require("../../utils/week-menu");

function decorateDays(days) {
  return days.map((day, index) => ({
    ...day,
    open: index === 0,
    className: index === 0 ? "plan-day plan-day-open" : "plan-day",
    addAllText: `加入当天 ${day.recipes.length} 道菜`,
  }));
}

Page({
  data: {
    days: [],
    loading: true,
    generationSeed: 0,
    dateRangeText: "",
    totalRecipeCount: 0,
  },

  onLoad() {
    this.generatePlan(0);
  },

  generatePlan(generationSeed) {
    this.setData({ loading: true });
    const days = decorateDays(buildWeekPlan(new Date(), generationSeed));
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    const totalRecipeCount = new Set(
      days.flatMap((day) => day.recipes.map((recipe) => recipe.id)),
    ).size;

    this.setData({
      days,
      loading: false,
      generationSeed,
      dateRangeText: firstDay && lastDay
        ? `${firstDay.dateText} - ${lastDay.dateText}`
        : "",
      totalRecipeCount,
    });
  },

  regeneratePlan() {
    const nextSeed = this.data.generationSeed + 1;
    this.generatePlan(nextSeed);
    wx.showToast({
      title: "已换一套三餐菜单",
      icon: "none",
    });
  },

  toggleDay(event) {
    const { index } = event.currentTarget.dataset;
    if (index === undefined) {
      return;
    }
    const days = this.data.days.map((day, dayIndex) => {
      if (dayIndex !== Number(index)) {
        return day;
      }
      const open = !day.open;
      return Object.assign({}, day, {
        open,
        className: open ? "plan-day plan-day-open" : "plan-day",
      });
    });
    this.setData({ days });
  },

  addDayAndGo(event) {
    const { index } = event.currentTarget.dataset;
    const day = this.data.days[Number(index)];
    if (!day) {
      return;
    }
    store.addPickedRecipes(day.recipes.map((item) => item.id));
    wx.navigateTo({
      url: "/pages/match/index",
    });
  },

  addWeekAndGo() {
    const recipeIds = this.data.days.flatMap((day) => (
      day.recipes.map((recipe) => recipe.id)
    ));
    if (!recipeIds.length) {
      return;
    }
    store.setPickedRecipes(recipeIds);
    wx.navigateTo({
      url: "/pages/match/index",
    });
  },
});
