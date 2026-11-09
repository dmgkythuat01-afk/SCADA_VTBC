const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup() {
  let next = 0;
  const tables = {
      Assets: [],
      Managers: [],
      Jobs: [],
      Schedules: [],
      Members: [],
      Account: [],
    },
    c = {};
  vm.createContext(c);
  for (const name of ["Domain", "Store", "Auth", "Equipment"])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/appscript/" + name + ".js", "utf8"),
      c,
    );
  if (fs.existsSync("QuanLyThietBi/appscript/Managers.js"))
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/appscript/Managers.js", "utf8"),
      c,
    );
  Object.assign(c, {
    rows_: (name) => structuredClone(tables[name] || []),
    members_: () => structuredClone(tables.Members),
    write_: (name, r) => {
      const key = r.id || r.useName;
      const i = tables[name].findIndex((x) => (x.id || x.useName) === key);
      if (i < 0) tables[name].push(structuredClone(r));
      else tables[name][i] = structuredClone(r);
      return r;
    },
    id_: () => String(++next),
    now_: () => "2026-11-08T09:00:00Z",
    today_: () => "2026-11-08",
    audit_: () => {},
    settings_: () => ({}),
  });
  return {
    c,
    tables,
    admin: { email: "admin", role: "admin" },
    tech: { email: "worker", role: "technician" },
  };
}
test("manager registry validates permissions, revision and active-machine references", () => {
  const s = setup();
  a.throws(() => s.c.saveManager_(s.tech, { name: "A" }));
  const m = s.c.saveManager_(s.admin, {
    name: "A",
    email: " A@EXAMPLE.COM ",
    phone: "0123",
    position: "Trưởng xưởng",
  });
  a.equal(m.email, "a@example.com");
  a.throws(() =>
    s.c.saveManager_(s.admin, { id: m.id, revision: 999, name: "B" }),
  );
  s.tables.Assets.push({
    id: "M1",
    type: "machine",
    managerId: m.id,
    active: true,
  });
  a.throws(() => s.c.saveManager_(s.admin, { ...m, active: false }));
  a.throws(() => s.c.saveManager_(s.admin, { name: "B", email: "invalid" }));
});
test("machine requires an active manager while components inherit display responsibility without own assignment", () => {
  const s = setup(),
    manager = s.c.saveManager_(s.admin, { name: "Owner" });
  const w = s.c.saveAsset_(s.admin, { type: "workshop", name: "W" }),
    area = s.c.saveAsset_(s.admin, { type: "area", parentId: w.id, name: "A" });
  a.throws(() =>
    s.c.saveAsset_(s.admin, { type: "machine", parentId: area.id, name: "M" }),
  );
  const m = s.c.saveAsset_(s.admin, {
    type: "machine",
    parentId: area.id,
    name: "M",
    managerId: manager.id,
  });
  a.equal(m.managerId, manager.id);
  const updated = s.c.saveAsset_(s.admin, {
    ...m,
    name: "Renamed",
    managerId: undefined,
    checklist: [],
  });
  a.equal(updated.managerId, manager.id);
  a.throws(() =>
    s.c.saveAsset_(s.admin, {
      ...updated,
      managerId: "MISSING",
      checklist: [],
    }),
  );
  const component = s.c.saveAsset_(s.admin, {
    type: "component",
    parentId: m.id,
    name: "Part",
  });
  a.equal(component.managerId, "");
});
test("account contact email persists separately from username and safe snapshot", () => {
  const s = setup();
  s.tables.Members.push({
    _row: 2,
    email: "pcn.dung",
    name: "Dung",
    role: "admin",
    position: "admin",
    active: true,
    passWord: "existing",
    contactEmail: "old@example.com",
  });
  s.c.saveMember_(s.admin, {
    email: "pcn.dung",
    role: "admin",
    name: "Dung",
    contactEmail: " New@Example.com ",
  });
  a.equal(s.tables.Account[0].useName, "pcn.dung");
  a.equal(s.tables.Account[0].email, "new@example.com");
  a.equal(s.tables.Account[0].passWord, "existing");
  a.equal(s.c.snapshot_(s.admin).members[0].contactEmail, "old@example.com");
  a.throws(() =>
    s.c.saveMember_(s.admin, {
      email: "pcn.dung",
      role: "admin",
      name: "Dung",
      contactEmail: "not-email",
    }),
  );
});
test("asset department and installation date save, survive older clients and allow clearing",()=>{
 const s=setup();
 const asset=s.c.saveAsset_(s.admin,{type:"workshop",name:"Xưởng",managingDepartment:" Cơ khí ",installationDate:"2026-11-09",details:"380V"});
 a.equal(asset.managingDepartment,"Cơ khí");a.equal(asset.installationDate,"2026-11-09");
 const edited=s.c.saveAsset_(s.admin,{id:asset.id,revision:asset.revision,name:"Xưởng mới",details:"220V"});
 a.equal(edited.managingDepartment,"Cơ khí");a.equal(edited.installationDate,"2026-11-09");
 a.throws(()=>s.c.saveAsset_(s.admin,{...edited,checklist:[],installationDate:"2026-02-30"}));
 const cleared=s.c.saveAsset_(s.admin,{...edited,checklist:[],managingDepartment:"",installationDate:""});
 a.equal(cleared.managingDepartment,"");a.equal(cleared.installationDate,"");
});
