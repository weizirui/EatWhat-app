function pad(n) {
  return String(n).padStart(2, "0");
}

function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${ts}${rand}`;
}

function formatTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 生成订单展示标题。
 * @param {Date|string|number} input 创建订单的时间。
 * @returns {string} 适合页面展示的菜单标题。
 */
function formatOrderTitle(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    return "本次菜单";
  }
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())} 菜单`;
}

function plusMinutes(base, minutes) {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function formatDateTimeLocal(input) {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimePicker(input) {
  const d = input instanceof Date ? input : new Date(input);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

module.exports = {
  generateOrderId,
  formatOrderTitle,
  formatTime,
  plusMinutes,
  formatDateTimeLocal,
  formatDateTimePicker,
};
