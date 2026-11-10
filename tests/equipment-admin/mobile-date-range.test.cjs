const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function dates() {
  const c = {};
  vm.createContext(c);
  vm.runInContext(
    fs
      .readFileSync(
        "MobileQuanLyThietBi/appscript/MobileDateRange.html",
        "utf8",
      )
      .replace(/<\/?script>/g, ""),
    c,
  );
  return vm.runInContext("MobileDateRange", c);
}
test("default range is today plus six previous days, including month and year boundaries", () => {
  const d = dates();
  a.equal(d.lastSeven("2026-11-10").from, "2026-11-04");
  a.equal(d.lastSeven("2026-11-10").to, "2026-11-10");
  a.equal(d.lastSeven("2026-01-03").from, "2025-12-28");
  a.equal(d.lastSeven("2024-03-01").from, "2024-02-24");
});
test("date matching includes both endpoints and uses Vietnam calendar dates for timestamp fallback", () => {
  const d = dates(),
    range = d.lastSeven("2026-11-10");
  a.ok(d.matches({ createdDate: "2026-11-04" }, range));
  a.ok(d.matches({ createdDate: "2026-11-10" }, range));
  a.equal(d.matches({ createdDate: "2026-11-03" }, range), false);
  a.equal(d.matches({ createdDate: "2026-11-11" }, range), false);
  a.equal(d.day("2026-11-09T17:30:00Z"), "2026-11-10");
  a.ok(d.matches({ createdAt: "2026-11-03T17:30:00Z" }, range));
  a.equal(d.day("2026-11-10 00:30:00"), "2026-11-10");
  a.equal(d.matches({}, range), false);
});
test("inverted, missing and invalid calendar dates reject instead of clearing the applied range", () => {
  const d = dates();
  a.throws(() => d.validate("2026-11-11", "2026-11-10"), /Từ ngày/);
  a.throws(() => d.validate("", "2026-11-10"));
  a.throws(() => d.validate("2026-02-30", "2026-03-01"));
});
