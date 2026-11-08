const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const c = {};
vm.createContext(c);
vm.runInContext(
  fs.readFileSync("QuanLyThietBi/appscript/Domain.js", "utf8"),
  c,
);
test("actual completion calendar handles month ends, leap years and weeks", () => {
  a.equal(c.nextDue_("2026-01-31", 1, "month"), "2026-02-28");
  a.equal(c.nextDue_("2028-01-31", 1, "month"), "2028-02-29");
  a.equal(c.nextDue_("2026-11-15", 1, "month"), "2026-12-15");
  a.equal(c.nextDue_("2026-12-28", 2, "week"), "2027-01-11");
  a.throws(() => c.nextDue_("2026-02-30", 1, "month"));
  a.throws(() => c.nextDue_("2026-01-01", 0, "week"));
});
test("unfinished due work stays overdue; forward window excludes day15", () => {
  a.equal(c.dueState_("2026-11-08", "2026-11-08"), "overdue");
  a.equal(c.dueState_("2026-11-22", "2026-11-08"), "soon");
  a.equal(c.dueState_("2026-11-23", "2026-11-08"), "later");
});
