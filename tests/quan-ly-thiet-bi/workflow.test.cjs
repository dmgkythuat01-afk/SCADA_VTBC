const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup() {
  let n = 0;
  const tables = {
      Assets: [],
      Schedules: [],
      Jobs: [],
      Members: [
        {
          email: "admin@example.com",
          name: "Admin",
          role: "admin",
          active: true,
        },
        {
          email: "tech@example.com",
          name: "Tech",
          role: "technician",
          active: true,
        },
      ],
      Settings: [],
      Devices: [],
      Notifications: [],
    },
    c = {};
  vm.createContext(c);
  for (const name of [
    "Domain",
    "Store",
    "Auth",
    "Equipment",
    "Photos",
    "Reports",
  ])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/appscript/" + name + ".js", "utf8"),
      c,
    );
  Object.assign(c, {
    rows_: (name) => structuredClone(tables[name]),
    members_: () => structuredClone(tables.Members),
    write_: (name, obj) => {
      const id = obj.id || obj.key || obj.email,
        i = tables[name].findIndex((x) => (x.id || x.key || x.email) === id);
      if (i < 0) tables[name].push(structuredClone(obj));
      else tables[name][i] = structuredClone(obj);
      return obj;
    },
    id_: () => String(++n),
    now_: () => "2026-11-15T09:00:00.000Z",
    today_: () => "2026-11-15",
    ScriptApp: {
      getService: () => ({ getUrl: () => "https://script.google.com/test" }),
    },
    audit_: () => {},
  });
  return {
    c,
    tables,
    admin: { email: "admin@example.com", role: "admin" },
    tech: { email: "tech@example.com", role: "technician" },
  };
}
function chain(s) {
  let parentId = "";
  for (const type of ["workshop", "area", "machine", "component"]) {
    const item = s.c.saveAsset_(s.admin, {
      name: type,
      type,
      parentId,
      checklist: ["Check bearing"],
    });
    parentId = item.id;
  }
  return parentId;
}
test("hierarchy validates parents, retains removed parts and protects referenced assets", () => {
  const s = setup(),
    id = chain(s);
  a.equal(s.tables.Assets.length, 4);
  a.throws(() =>
    s.c.saveAsset_(s.admin, { type: "machine", parentId: id, name: "wrong" }),
  );
  const component = s.tables.Assets.at(-1);
  s.c.saveAsset_(s.admin, { ...component, active: false, checklist: [] });
  a.equal(s.tables.Assets.at(-1).active, false);
  a.equal(s.tables.Assets.length, 4);
  a.throws(() =>
    s.c.saveAsset_(s.tech, { name: "forbidden", type: "workshop" }),
  );
});
test("completion uses actual date, all checks, assignee and replay safety", () => {
  const s = setup(),
    id = chain(s),
    schedule = s.c.saveSchedule_(s.admin, {
      componentId: id,
      name: "Oil",
      interval: 1,
      unit: "month",
      dueDate: "2026-11-10",
      assignee: s.tech.email,
      checklist: ["One", "Two"],
    }),
    job = s.c.openJob_(s.tech, {
      componentId: id,
      scheduleId: schedule.id,
      requestId: "open",
    });
  const body = {
    id: job.id,
    revision: 1,
    completedDate: "2026-11-15",
    result: "done",
    checks: [true, true],
    requestId: "complete",
  };
  a.throws(() => s.c.completeJob_(s.tech, { ...body, checks: [true, false] }));
  a.equal(s.tables.Jobs[0].status, "open");
  s.c.completeJob_(s.tech, body);
  a.equal(s.tables.Schedules[0].dueDate, "2026-12-15");
  a.equal(s.tables.Jobs[0].completedBy, s.tech.email);
  s.c.completeJob_(s.tech, body);
  a.equal(s.tables.Schedules[0].dueDate, "2026-12-15");
  a.throws(() => s.c.completeJob_(s.tech, { ...body, requestId: "other" }));
});
test("one ongoing maintenance per schedule and exact request deduplication", () => {
  const s = setup(),
    id = chain(s),
    schedule = s.c.saveSchedule_(s.admin, {
      componentId: id,
      name: "Check",
      interval: 1,
      unit: "week",
      dueDate: "2026-11-15",
    });
  const one = s.c.openJob_(s.admin, {
      componentId: id,
      scheduleId: schedule.id,
      requestId: "a",
    }),
    two = s.c.openJob_(s.admin, {
      componentId: id,
      scheduleId: schedule.id,
      requestId: "b",
    });
  a.equal(one.id, two.id);
  a.equal(s.tables.Jobs.length, 1);
});
test("stale edits, future completion and unrelated technicians cannot finish job", () => {
  const s = setup(),
    id = chain(s),
    j = s.c.openJob_(s.admin, {
      componentId: id,
      title: "Repair",
      assignee: s.admin.email,
      requestId: "a",
    });
  a.throws(() => s.c.completeJob_(s.tech, { id: j.id }));
  a.throws(() => s.c.completeJob_(s.admin, { id: j.id, revision: 999 }));
  a.throws(() =>
    s.c.completeJob_(s.admin, {
      id: j.id,
      revision: 1,
      completedDate: "2026-11-16",
      result: "x",
      requestId: "c",
    }),
  );
});
test("completion reconciliation fixes interrupted schedule write without repeating completion", () => {
  const s = setup(),
    id = chain(s),
    schedule = s.c.saveSchedule_(s.admin, {
      componentId: id,
      name: "Check",
      interval: 2,
      unit: "week",
      dueDate: "2026-11-10",
    }),
    j = s.c.openJob_(s.admin, {
      componentId: id,
      scheduleId: schedule.id,
      requestId: "open",
    });
  s.tables.Schedules[0].updatedAt = "2026-11-01T00:00:00.000Z";
  Object.assign(s.tables.Jobs[0], {
    status: "completed",
    completedDate: "2026-11-15",
    completedAt: "2026-11-15T08:00:00.000Z",
    requestId: "done",
  });
  s.c.completeJob_(s.admin, { id: j.id, requestId: "done" });
  a.equal(s.tables.Schedules[0].dueDate, "2026-11-29");
  a.equal(s.tables.Jobs.length, 1);
});
test("private attachments: supports many photos, rejects invalid payload, deduplicates upload", () => {
  const s = setup(),
    id = chain(s),
    j = s.c.openJob_(s.admin, {
      componentId: id,
      title: "Repair",
      requestId: "open",
    });
  let created = 0;
  s.c.props_ = () => ({ getProperty: () => "folder" });
  s.c.Utilities = {
    base64Decode: () => [-1, -40, -1, -39],
    newBlob: () => ({}),
  };
  s.c.DriveApp = {
    getFolderById: () => ({
      createFile: () => ({ getId: () => "photo" + ++created }),
    }),
  };
  const p = {
    jobId: j.id,
    dataUrl: "data:image/jpeg;base64,/9j/2Q==",
    requestId: "p1",
  };
  s.c.uploadPhoto_(s.admin, p);
  s.c.uploadPhoto_(s.admin, p);
  s.c.uploadPhoto_(s.admin, { ...p, requestId: "p2" });
  a.equal(created, 2);
  a.equal(JSON.parse(s.tables.Jobs[0].photos).length, 2);
  a.throws(() =>
    s.c.uploadPhoto_(s.admin, {
      ...p,
      requestId: "bad",
      dataUrl: "https://bad.example/a.jpg",
    }),
  );
  a.throws(() => s.c.readPhoto_(s.admin, { jobId: j.id, id: "unrelated" }));
});
test("last admin cannot be removed and unauthorized emails never become members", () => {
  const s = setup();
  a.throws(() =>
    s.c.saveMember_(s.admin, {
      email: s.admin.email,
      name: "Admin",
      role: "technician",
    }),
  );
  a.throws(() =>
    s.c.saveMember_(s.tech, {
      email: "new@example.com",
      name: "new",
      role: "admin",
    }),
  );
  a.equal(s.tables.Members.length, 2);
});
test("report includes overdue and rolling14day work, escapes HTML and deduplicates scheduled sends", () => {
  const s = setup(),
    id = chain(s);
  s.c.saveSchedule_(s.admin, {
    componentId: id,
    name: "<script>",
    interval: 1,
    unit: "week",
    dueDate: "2026-11-01",
  });
  s.c.saveSchedule_(s.admin, {
    componentId: id,
    name: "Soon",
    interval: 1,
    unit: "week",
    dueDate: "2026-11-29",
  });
  s.c.saveSchedule_(s.admin, {
    componentId: id,
    name: "Later",
    interval: 1,
    unit: "week",
    dueDate: "2026-11-30",
  });
  s.c.setting_("reportEmails", "admin@example.com");
  let sent = 0;
  s.c.MailApp = { sendEmail: () => sent++ };
  const r = s.c.reportData_();
  a.equal(r.overdue.length, 1);
  a.equal(r.soon.length, 1);
  a.ok(s.c.reportHtml_(r).includes("&lt;script&gt;"));
  s.c.sendReport_(false);
  s.c.sendReport_(false);
  a.equal(sent, 1);
});
test("failed report stays retryable and is logged without marking sent", () => {
  const s = setup();
  s.c.setting_("reportEmails", "admin@example.com");
  let calls = 0;
  s.c.MailApp = {
    sendEmail: () => {
      if (++calls === 1) throw Error("quota");
    },
  };
  a.equal(s.c.sendReport_(false).success, false);
  a.equal(s.tables.Notifications[0].status, "failed");
  a.equal(s.c.sendReport_(false).success, true);
  a.equal(calls, 2);
});
test("authentication rejects token errors and non-members before any write", () => {
  const s = setup();
  s.c.props_ = () => ({ getProperty: () => "key" });
  s.c.Session = {
    getEffectiveUser: () => ({ getEmail: () => "owner@example.com" }),
  };
  s.c.UrlFetchApp = {
    fetch: () => ({
      getResponseCode: () => 200,
      getContentText: () =>
        JSON.stringify({
          users: [{ email: "outsider@example.com", emailVerified: true }],
        }),
    }),
  };
  a.throws(() => s.c.identity_("x".repeat(120)));
  a.throws(() => s.c.identity_("short"));
  s.c.UrlFetchApp.fetch = () => ({ getResponseCode: () => 403 });
  a.throws(() => s.c.identity_("x".repeat(120)));
});

test("replaying original open after completion never creates a second job", () => {
  const s = setup(),
    id = chain(s),
    payload = { componentId: id, title: "Repair", requestId: "original-open" },
    j = s.c.openJob_(s.admin, payload);
  s.c.completeJob_(s.admin, {
    id: j.id,
    revision: 1,
    completedDate: "2026-11-15",
    result: "Done",
    requestId: "completion",
  });
  const repeated = s.c.openJob_(s.admin, payload);
  a.equal(repeated.id, j.id);
  a.equal(s.tables.Jobs.length, 1);
  a.equal(repeated.status, "completed");
});

test("custom Account position survives safe snapshot without password exposure", () => {
  const s = setup();
  s.tables.Members[1].position = "Trưởng ca";
  s.tables.Members[1].passWord = "secret";
  const m = s.c
    .snapshot_(s.admin)
    .members.find((m) => m.email === s.tech.email);
  a.equal(m.position, "Trưởng ca");
  a.equal(m.passWord, undefined);
  a.equal(m.authVersion, undefined);
});
test("scheduled reporting handler is private to Apps Script and not a login-page endpoint", () => {
  const s = setup();
  a.equal(typeof s.c.scheduledEquipmentReport, "undefined");
  a.equal(typeof s.c.scheduledEquipmentReport_, "function");
});
