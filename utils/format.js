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
  formatTime,
  plusMinutes,
  formatDateTimeLocal,
  formatDateTimePicker,
};
