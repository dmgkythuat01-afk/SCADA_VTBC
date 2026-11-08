const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup() {
  let n = 0;
  const tables = {
    Assets: [
      { id: "W", type: "workshop", active: true },
      { id: "A", type: "area", parentId: "W", active: true },
      {
        id: "M",
        type: "machine",
        parentId: "A",
        name: "Machine",
        active: true,
      },
      {
        id: "C",
        type: "component",
        parentId: "M",
        name: "Motor",
        active: true,
      },
    ],
    Requests: [],
    ServiceReports: [],
    ServiceReviews: [],
    Schedules: [],
    Jobs: [],
    Notifications: [],
    Audit: [],
    Account: [],
  };
  const c = {};
  vm.createContext(c);
  for (const name of [
    "Domain",
    "Store",
    "MobileRequests",
    "MobileRequestPhotos",
  ])
    if (fs.existsSync("QuanLyThietBi/appscript/" + name + ".js"))
      vm.runInContext(
        fs.readFileSync("QuanLyThietBi/appscript/" + name + ".js", "utf8"),
        c,
      );
  const creator = {
      email: "ca",
      name: "Ca",
      role: "technician",
      position: "TruongCa",
    },
    worker = {
      email: "kt1",
      name: "KT1",
      role: "technician",
      position: "KyThuat",
    },
    other = {
      email: "kt2",
      name: "KT2",
      role: "technician",
      position: "CoKhi",
    },
    outsider = {
      email: "cn",
      name: "CN",
      role: "technician",
      position: "CongNhan",
    },
    admin = { email: "admin", name: "Admin", role: "admin", position: "admin" };
  const users = [creator, worker, other, outsider, admin];
  Object.assign(c, {
    rows_: (name) => structuredClone(tables[name] || []),
    members_: () =>
      users.map((u) => ({ ...u, useName: u.email, active: true })),
    write_: (name, row) => {
      const i = tables[name].findIndex((x) => x.id === row.id);
      if (i < 0) tables[name].push(structuredClone(row));
      else tables[name][i] = structuredClone(row);
      return row;
    },
    id_: () => String(++n),
    now_: () => "2026-11-08T08:00:00.000Z",
    today_: () => "2026-11-08",
    audit_: () => {},
  });
  return { c, tables, creator, worker, other, outsider, admin };
}
function create(s, extra = {}) {
  return s.c.mobileCreateRequest_(s.creator, {
    workshopId: "W",
    machineId: "M",
    componentId: "",
    type: "repair",
    description: "Detailed problem",
    assignedTo: "kt1",
    requestKey: "create-1",
    ...extra,
  });
}
function report(s, r, who = s.other, extra = {}) {
  const d = s.c.mobileStartReport_(who, {
    requestId: r.id,
    revision: r.revision,
    draftKey: "draft-" + who.email,
  });
  return s.c.mobileSubmitReport_(who, {
    reportId: d.id,
    revision: d.revision,
    content: "Fixed motor",
    performedDate: "2026-11-08",
    submitKey: "submit-" + who.email,
    checks: [],
    ...extra,
  });
}
test("requester may create machine-level ticket; assignment and workshop membership are validated", () => {
  const s = setup(),
    r = create(s);
  a.equal(r.componentId, "");
  a.equal(r.createdBy, "ca");
  a.throws(() => create(s, { requestKey: "bad", workshopId: "OTHER" }));
  a.throws(() =>
    s.c.mobileCreateRequest_(s.worker, { workshopId: "W", machineId: "M" }),
  );
  a.throws(() => create(s, { requestKey: "bad2", assignedTo: "cn" }));
  a.equal(s.tables.Requests.length, 1);
});
test("any technical account can report; actual performer is the authenticated account and only creator can accept", () => {
  const s = setup(),
    r = create(s),
    out = report(s, r, s.other, { actualBy: "spoof" }),
    fresh = s.tables.Requests[0];
  a.equal(out.actualBy, "kt2");
  a.equal(fresh.status, "awaiting_confirmation");
  a.throws(() =>
    s.c.mobileReviewReport_(s.outsider, {
      requestId: r.id,
      reportId: out.id,
      revision: fresh.revision,
      decision: "accept",
      reviewKey: "bad",
    }),
  );
  s.c.mobileReviewReport_(s.creator, {
    requestId: r.id,
    reportId: out.id,
    revision: fresh.revision,
    decision: "accept",
    reviewKey: "accept1",
  });
  a.equal(s.tables.Requests[0].status, "completed");
  a.equal(s.tables.Jobs[0].completedBy, "kt2");
});
test("reject requires reason; re-report preserves first report and review history", () => {
  const s = setup(),
    r = create(s),
    one = report(s, r),
    pending = s.tables.Requests[0];
  a.throws(() =>
    s.c.mobileReviewReport_(s.creator, {
      requestId: r.id,
      reportId: one.id,
      revision: pending.revision,
      decision: "reject",
      reviewKey: "r0",
    }),
  );
  s.c.mobileReviewReport_(s.creator, {
    requestId: r.id,
    reportId: one.id,
    revision: pending.revision,
    decision: "reject",
    reason: "Still leaking",
    reviewKey: "r1",
  });
  a.equal(s.tables.Requests[0].status, "rework");
  a.equal(s.tables.Jobs.length, 0);
  const two = report(s, s.tables.Requests[0], s.worker);
  a.notEqual(one.id, two.id);
  a.equal(s.tables.ServiceReports[0].status, "rejected");
  a.equal(s.tables.ServiceReviews.length, 1);
  a.equal(s.tables.ServiceReports.length, 2);
});
test("idempotent create/submit/review never duplicate requests, history or accepted desktop job", () => {
  const s = setup(),
    r = create(s);
  a.equal(create(s).id, r.id);
  const d = s.c.mobileStartReport_(s.other, {
      requestId: r.id,
      revision: r.revision,
      draftKey: "draft",
    }),
    body = {
      reportId: d.id,
      revision: d.revision,
      content: "Done",
      performedDate: "2026-11-08",
      submitKey: "submit",
    };
  const out = s.c.mobileSubmitReport_(s.other, body);
  s.c.mobileSubmitReport_(s.other, body);
  const review = {
    requestId: r.id,
    reportId: out.id,
    revision: s.tables.Requests[0].revision,
    decision: "accept",
    reviewKey: "review",
  };
  s.c.mobileReviewReport_(s.creator, review);
  s.c.mobileReviewReport_(s.creator, review);
  a.equal(s.tables.Requests.length, 1);
  a.equal(s.tables.ServiceReports.length, 1);
  a.equal(s.tables.ServiceReviews.length, 1);
  a.equal(s.tables.Jobs.length, 1);
});
test("linked periodic schedule advances only upon acceptance from actual performed date", () => {
  const s = setup();
  s.tables.Schedules.push({
    id: "S",
    componentId: "C",
    name: "Oil",
    interval: 1,
    unit: "month",
    dueDate: "2026-11-01",
    active: true,
    revision: 1,
    checklist: "[]",
    updatedAt: "2026-10-01T00:00:00Z",
  });
  const r = create(s, {
      componentId: "C",
      type: "maintenance",
      scheduleId: "S",
    }),
    out = report(s, r);
  a.equal(s.tables.Schedules[0].dueDate, "2026-11-01");
  const body = {
    requestId: r.id,
    reportId: out.id,
    revision: s.tables.Requests[0].revision,
    decision: "accept",
    reviewKey: "approve",
  };
  s.c.mobileReviewReport_(s.creator, body);
  a.equal(s.tables.Schedules[0].dueDate, "2026-12-08");
  s.c.mobileReviewReport_(s.creator, body);
  a.equal(s.tables.Schedules[0].revision, 2);
});
test("requesters see their own tickets; technicians see all; drafts are private to their author", () => {
  const s = setup(),
    r = create(s);
  s.c.mobileStartReport_(s.worker, {
    requestId: r.id,
    revision: r.revision,
    draftKey: "d",
  });
  a.equal(s.c.mobileSnapshot_(s.outsider).requests.length, 0);
  a.equal(s.c.mobileSnapshot_(s.other).requests.length, 1);
  a.equal(s.c.mobileSnapshot_(s.other).reports.length, 0);
  a.equal(s.c.mobileSnapshot_(s.worker).reports.length, 1);
});
test("concurrent drafts cannot overwrite the first submitted result", () => {
  const s = setup(),
    r = create(s);
  const d1 = s.c.mobileStartReport_(s.worker, {
    requestId: r.id,
    revision: r.revision,
    draftKey: "one",
  });
  const d2 = s.c.mobileStartReport_(s.other, {
    requestId: r.id,
    revision: s.tables.Requests[0].revision,
    draftKey: "two",
  });
  const out = s.c.mobileSubmitReport_(s.other, {
    reportId: d2.id,
    revision: d2.revision,
    content: "Fixed",
    performedDate: "2026-11-08",
    submitKey: "s2",
  });
  a.equal(out.ordinal, 1);
  a.throws(() =>
    s.c.mobileSubmitReport_(s.worker, {
      reportId: d1.id,
      revision: d1.revision,
      content: "Other",
      performedDate: "2026-11-08",
      submitKey: "s1",
    }),
  );
  a.equal(s.tables.Requests[0].lastReportId, d2.id);
});
test("independently changed schedule is preserved on acceptance and flagged for checking", () => {
  const s = setup();
  s.tables.Schedules.push({
    id: "S",
    componentId: "C",
    interval: 1,
    unit: "month",
    dueDate: "2026-11-01",
    active: true,
    revision: 1,
    checklist: "[]",
  });
  const r = create(s, {
      componentId: "C",
      type: "maintenance",
      scheduleId: "S",
    }),
    d = report(s, r);
  Object.assign(s.tables.Schedules[0], { revision: 2, dueDate: "2027-01-01" });
  const review = s.c.mobileReviewReport_(s.creator, {
    requestId: r.id,
    reportId: d.id,
    revision: s.tables.Requests[0].revision,
    decision: "accept",
    reviewKey: "a",
  });
  a.equal(review.calendarResult, "skipped_changed");
  a.equal(s.tables.Schedules[0].dueDate, "2027-01-01");
  a.equal(s.tables.Jobs[0].scheduleId, "");
});
test("partial report/confirmation writes reconcile without duplicate jobs or calendar shifts", () => {
  const s = setup(),
    r = create(s),
    d = s.c.mobileStartReport_(s.other, {
      requestId: r.id,
      revision: r.revision,
      draftKey: "d",
    });
  Object.assign(s.tables.ServiceReports[0], {
    status: "submitted",
    content: "Fixed",
    performedDate: "2026-11-08",
    submittedAt: "2026-11-08T08:00:00Z",
    submitKey: "s",
  });
  s.c.reconcileMobileRequests_();
  a.equal(s.tables.Requests[0].status, "awaiting_confirmation");
  s.tables.ServiceReviews.push({
    id: "V",
    requestId: r.id,
    reportId: d.id,
    decision: "accept",
    reason: "",
    createdBy: "ca",
    createdByName: "Ca",
    createdAt: "2026-11-08T08:00:00Z",
    reviewKey: "v",
    processed: false,
  });
  s.c.reconcileMobileRequests_();
  s.c.reconcileMobileRequests_();
  a.equal(s.tables.Requests[0].status, "completed");
  a.equal(s.tables.Jobs.length, 1);
});
test("photo reads are scoped to visible request and draft author before Drive access", () => {
  const s = setup(),
    r = create(s),
    d = s.c.mobileStartReport_(s.worker, {
      requestId: r.id,
      revision: r.revision,
      draftKey: "d",
    });
  s.tables.ServiceReports[0].photos = '[{"id":"FILE"}]';
  let reads = 0;
  s.c.DriveApp = {
    getFileById: () => {
      reads++;
      throw Error("should not read");
    },
  };
  a.throws(() =>
    s.c.mobileReadReportPhoto_(s.outsider, { reportId: d.id, id: "FILE" }),
  );
  a.throws(() =>
    s.c.mobileReadReportPhoto_(s.other, { reportId: d.id, id: "FILE" }),
  );
  a.equal(reads, 0);
});
test("draft photo upload is actor-scoped, deduplicated and rejected before Drive on invalid image", () => {
  const s = setup(),
    r = create(s),
    d = s.c.mobileStartReport_(s.worker, {
      requestId: r.id,
      revision: r.revision,
      draftKey: "draft",
    });
  let files = 0;
  s.c.props_ = () => ({ getProperty: () => "FOLDER" });
  s.c.Utilities = {
    base64Decode: () => [-1, -40, -1, -39],
    newBlob: () => ({}),
  };
  s.c.DriveApp = {
    getFolderById: () => ({
      createFile: () => ({ getId: () => "PHOTO" + ++files }),
    }),
  };
  const p = {
    reportId: d.id,
    revision: d.revision,
    uploadKey: "image-1",
    dataUrl: "data:image/jpeg;base64,/9j/2Q==",
    name: "photo.jpg",
  };
  a.throws(() => s.c.mobileUploadReportPhoto_(s.other, p));
  s.c.mobileUploadReportPhoto_(s.worker, p);
  s.c.mobileUploadReportPhoto_(s.worker, p);
  a.equal(files, 1);
  a.throws(() =>
    s.c.mobileUploadReportPhoto_(s.worker, {
      ...p,
      uploadKey: "bad",
      revision: s.tables.ServiceReports[0].revision,
      dataUrl: "https://example.com/image.jpg",
    }),
  );
  a.equal(files, 1);
});
test("requester roles cannot use the desktop API to bypass mobile request scope", () => {
  const s = setup();
  vm.runInContext(
    fs.readFileSync("QuanLyThietBi/appscript/Auth.js", "utf8"),
    s.c,
  );
  s.c.identity_ = () => s.creator;
  a.throws(() => s.c.equipmentApi("token", "snapshot", {}));
  a.equal(
    s.c.mobileCapabilities_({ role: "technician", position: "KyThuat1" })
      .technical,
    false,
  );
});
