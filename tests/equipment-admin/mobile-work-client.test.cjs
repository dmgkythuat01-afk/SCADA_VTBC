const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup() {
  const source = fs.readFileSync(
      "MobileQuanLyThietBi/appscript/MobileClient.html",
      "utf8",
    ),
    start = source.indexOf("    async function api("),
    end = source.indexOf("    function toast(", start),
    state = { token: "account-A" };
  let resolve;
  const c = { M: state, rpc: () => new Promise((r) => (resolve = r)) };
  vm.createContext(c);
  vm.runInContext(source.slice(start, end) + "\nglobalThis.send=api;", c);
  return { c, state, respond: (value) => resolve(value) };
}
test("delayed mutation response cannot queue a snapshot after logout and another login", async () => {
  const s = setup(),
    pending = s.c.send("claim", { requestId: "request-A" });
  s.state.token = "account-B";
  s.respond({
    result: { id: "request-A" },
    snapshot: { user: { email: "account-A" } },
  });
  await a.rejects(pending, /Phiên đăng nhập đã thay đổi/);
  a.equal(s.state.nextSnapshot, undefined);
});
test("combined mutation queues fresh snapshot bound to initiating session", async () => {
  const s = setup(),
    pending = s.c.send("claim", { requestId: "request-A" });
  s.respond({
    result: { id: "request-A" },
    snapshot: { user: { email: "account-A" } },
  });
  a.equal((await pending).id, "request-A");
  a.equal(s.state.nextSnapshot.token, "account-A");
  a.equal(s.state.nextSnapshot.data.user.email, "account-A");
});
