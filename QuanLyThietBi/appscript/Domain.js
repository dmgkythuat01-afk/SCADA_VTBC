function validDate_(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text)))
    throw Error("Ngày không hợp lệ.");
  const d = new Date(text + "T00:00:00Z");
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text)
    throw Error("Ngày không hợp lệ.");
  return d;
}
function nextDue_(completed, interval, unit) {
  const d = validDate_(completed),
    n = Number(interval);
  if (
    !Number.isInteger(n) ||
    n < 1 ||
    n > 120 ||
    !["week", "month"].includes(unit)
  )
    throw Error("Chu kỳ phải từ 1 đến 120 tuần/tháng.");
  if (unit === "week") d.setUTCDate(d.getUTCDate() + n * 7);
  else {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    const end = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(day, end));
  }
  return d.toISOString().slice(0, 10);
}
function dueState_(due, today) {
  const distance = (validDate_(due) - validDate_(today)) / 86400000;
  return distance <= 0 ? "overdue" : distance <= 14 ? "soon" : "later";
}
function text_(v, max) {
  return String(v == null ? "" : v)
    .trim()
    .slice(0, max || 2000);
}
function required_(v, label, max) {
  const t = text_(v, max);
  if (!t) throw Error("Cần nhập " + label + ".");
  return t;
}
function escape_(v) {
  return String(v == null ? "" : v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
