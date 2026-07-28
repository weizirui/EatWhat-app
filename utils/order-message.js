function clampList(items, maxCount) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      list: [],
      extra: 0,
    };
  }
  if (items.length <= maxCount) {
    return {
      list: items,
      extra: 0,
    };
  }
  return {
    list: items.slice(0, maxCount),
    extra: items.length - maxCount,
  };
}

function joinWithExtra(items, extra, suffixUnit) {
  if (items.length === 0) {
    return "";
  }
  const base = items.join("、");
  if (extra <= 0) {
    return base;
  }
  return `${base} 等 ${extra}${suffixUnit}`;
}

function safeTrim(value) {
  return String(value || "").trim();
}

function buildOrderMessage(input) {
  const orderId = safeTrim(input && input.orderId);
  const recipes = Array.isArray(input && input.recipes) ? input.recipes.map((item) => safeTrim(item)).filter(Boolean) : [];
  const suggested = Array.isArray(input && input.suggested) ? input.suggested.map((item) => safeTrim(item)).filter(Boolean) : [];

  const recipeClamped = clampList(recipes, 5);
  const suggestedClamped = clampList(suggested, 6);

  const lines = [];
  lines.push("✅ 已收到你的订单");
  if (orderId) {
    lines.push(`订单号：${orderId}`);
  }
  if (recipeClamped.list.length) {
    lines.push(`菜谱：${joinWithExtra(recipeClamped.list, recipeClamped.extra, "道")}`);
  }
  if (suggestedClamped.list.length) {
    lines.push(`采购食材：${joinWithExtra(suggestedClamped.list, suggestedClamped.extra, "项")}`);
  }
  lines.push("打开小程序 → 查看完整做法");

  const output = lines.filter(Boolean).join("\n");
  return output.length > 220 ? output.slice(0, 217).concat("...") : output;
}

module.exports = {
  buildOrderMessage,
};
