const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  crypto = require("node:crypto");
function setup() {
  const values = new Map(),
    cache = new Map(),
    members = [];
  let writes = 0;
  const c = {
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (p, k) =>
        Array.from(crypto.createHmac("sha256", k).update(p).digest(), (b) =>
          b > 127 ? b - 256 : b,
        ),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cache.get(k) || null,
        put: (k, v) => cache.set(k, v),
        remove: (k) => cache.delete(k),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => values.get(k),
        setProperty: (k, v) => values.set(k, v),
      }),
    },
    rows_: () => structuredClone(members),
    write_: (name, m) => {
      writes++;
      const i = members.findIndex((x) => x.email === m.email);
      if (i < 0) members.push(structuredClone(m));
      else members[i] = structuredClone(m);
    },
    props_: () => c.PropertiesService.getScriptProperties(),
    text_: (v, max = 2000) =>
      String(v ?? "")
        .trim()
        .slice(0, max),
    required_: (v) => {
      if (!v) throw Error("required");
      return String(v);
    },
    enabled_: (m) => String(m.active) !== "false",
    audit_: () => {},
  };
  vm.createContext(c);
  vm.runInContext(
    fs.readFileSync("QuanLyThietBi/appscript/Auth.js", "utf8"),
    c,
  );
  const m = {
    useName: "owner@example.com",
    email: "owner@example.com",
    name: "Owner",
    role: "admin",
    active: true,
  };
  return {
    c,
    m,
    members,
    cache,
    get writes() {
      return writes;
    },
  };
}
test("sheet account password is hashed; valid session checks current membership and revokes on logout", () => {
  const s = setup();
  s.c.setMemberPassword_(s.m, "A-strong-password-2026");
  s.members.push(s.m);
  a.ok(s.m.passWord.startsWith("$eq$1$"));
  a.notEqual(s.m.passWord, "A-strong-password-2026");
  const r = s.c.loginEquipment("OWNER@example.com", "A-strong-password-2026");
  a.equal(s.c.identity_(r.token).email, "owner@example.com");
  s.c.logoutEquipment(r.token);
  a.throws(() => s.c.identity_(r.token));
});
test("bad credentials are generic and repeated guesses are throttled", () => {
  const s = setup();
  s.c.setMemberPassword_(s.m, "A-strong-password-2026");
  s.members.push(s.m);
  for (let i = 0; i < 5; i++)
    a.throws(() => s.c.loginEquipment(s.m.email, "wrong"));
  a.throws(() => s.c.loginEquipment(s.m.email, "A-strong-password-2026"));
  a.equal(s.writes, 0);
});
test("disabled accounts and password changes invalidate existing sessions", () => {
  const s = setup();
  s.c.setMemberPassword_(s.m, "A-strong-password-2026");
  s.members.push(s.m);
  const r = s.c.loginEquipment(s.m.email, "A-strong-password-2026");
  s.members[0].role = "disabled";
  a.throws(() => s.c.identity_(r.token));
  s.members[0].role = "admin";
  s.c.setMemberPassword_(s.members[0], "Another-strong-password");
  a.throws(() => s.c.identity_(r.token));
});

test("Account accepts manually entered passwords and username case, without exposing credentials", () => {
  const s = setup();
  s.members.push({
    useName: "Vg.dung",
    passWord: "123456",
    role: "Kỹ thuật",
    name: "Nguyễn Văn Dũng",
  });
  const r = s.c.loginEquipment("vg.DUNG", "123456");
  a.equal(r.user.name, "Nguyễn Văn Dũng");
  a.equal(r.user.role, "technician");
  a.equal(r.user.passWord, undefined);
  a.equal(s.c.identity_(r.token).email, "vg.dung");
});
test("duplicate Account usernames cannot select an arbitrary account", () => {
  const s = setup();
  s.members.push(
    { useName: "worker", passWord: "123456", role: "Kỹ thuật", name: "A" },
    { useName: "WORKER", passWord: "123456", role: "admin", name: "B" },
  );
  a.throws(() => s.c.loginEquipment("worker", "123456"));
});

test("future Workspace email does not change username/password login or current session", () => {
  const s = setup();
  s.members.push({
    useName: "pcn.dung",
    passWord: "123456",
    role: "Kỹ thuật",
    name: "Dung",
    email: " Dung@Example.com ",
  });
  const r = s.c.loginEquipment("PCN.DUNG", "123456");
  a.equal(r.user.email, "pcn.dung");
  a.equal(r.user.contactEmail, "dung@example.com");
  a.throws(() => s.c.loginEquipment("dung@example.com", "123456"));
  s.members[0].email = "new@example.com";
  a.equal(s.c.identity_(r.token).email, "pcn.dung");
  a.equal(s.c.identity_(r.token).contactEmail, "new@example.com");
});
