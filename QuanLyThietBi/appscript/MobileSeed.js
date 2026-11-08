function setupMobileRequests_() {
  const ss = db_(),
    before = Object.keys(EQUIPMENT_SHEETS)
      .map((key) => {
        const sh = equipmentSheet_(ss, key);
        return sh && sh.getLastRow()
          ? {
              key,
              width: sh.getLastColumn(),
              rows: sh.getLastRow(),
              digest: equipmentDataDigest_(sh.getDataRange().getValues()),
            }
          : null;
      })
      .filter(Boolean);
  ensureStore_();
  SpreadsheetApp.flush();
  const checks = before.map((item) => {
    const sh = equipmentSheet_(ss, item.key);
    if (
      sh.getLastRow() !== item.rows ||
      equipmentDataDigest_(
        sh.getRange(1, 1, item.rows, item.width).getValues(),
      ) !== item.digest
    )
      throw Error(
        "Dữ liệu thay đổi đồng thời ở " +
          EQUIPMENT_STORAGE[item.key].sheet +
          ".",
      );
    return {
      sheet: EQUIPMENT_STORAGE[item.key].sheet,
      preserved: true,
      rows: Math.max(0, item.rows - 1),
    };
  });
  return { success: true, checks };
}
function mobileDemoData_(today, passwords) {
  const offset = (n) => {
      const d = validDate_(today);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    },
    at = (n, h = "02") => offset(n) + "T" + h + ":00:00.000Z";
  const roles = [
    ["truongca", "TruongCa", "Trưởng ca mẫu"],
    ["congnhan", "CongNhan", "Công nhân mẫu"],
    ["pcn", "PhongCongNghe", "Phòng Công nghệ mẫu"],
    ["kythuat", "KyThuat", "Kỹ thuật mẫu"],
    ["cokhi", "CoKhi", "Cơ khí mẫu"],
    ["tudonghoa", "TuDongHoa", "Tự động hóa mẫu"],
  ];
  const names = {};
  roles.forEach(([key, , name]) => (names["mau." + key] = "[MẪU] " + name));
  const make = (
    key,
    creator,
    assigned,
    type,
    workshop,
    machine,
    part,
    title,
    status,
    actual,
    lastReport,
  ) => ({
    id: "DEMO_MOBILE_" + key,
    workshopId: "DEMO_" + workshop,
    workshopName:
      workshop === "X01"
        ? "[MẪU] Xưởng Viên giặt"
        : "[MẪU] Xưởng Viên treo bồn cầu",
    machineId: "DEMO_" + machine,
    machineName: {
      M01: "[MẪU] Máy trộn 500 kg",
      M02: "[MẪU] Máy đóng gói tự động",
      M03: "[MẪU] Máy ép tạo hình",
    }[machine],
    componentId: part ? "DEMO_" + part : "",
    componentName:
      {
        BP01: "[MẪU] Động cơ truyền động",
        BP02: "[MẪU] Hộp giảm tốc",
        BP03: "[MẪU] Bộ gia nhiệt hàn túi",
        BP04: "[MẪU] Băng tải cấp liệu",
        BP05: "[MẪU] Bơm thủy lực",
      }[part] || "",
    type,
    title: "[MẪU] " + title,
    description:
      "Phiếu minh họa để thử quy trình mobile. Không phải sự cố thực tế. " +
      title,
    assignedTo: "mau." + assigned,
    createdBy: "mau." + creator,
    createdByName: names["mau." + creator],
    createdAt: at(-4),
    createdDate: offset(-4),
    status,
    actualBy: actual ? "mau." + actual : "",
    actualByName: actual ? names["mau." + actual] : "",
    lastReportId: lastReport ? "DEMO_BC_" + lastReport : "",
    scheduleId: "",
    completedDate: status === "completed" ? offset(-1) : "",
    confirmedAt: ["completed", "rework"].includes(status) ? at(-1, "04") : "",
    confirmedBy: ["completed", "rework"].includes(status)
      ? "mau." + creator
      : "",
    updatedAt: at(-1),
    revision:
      status === "new"
        ? 1
        : status === "in_progress"
          ? 2
          : status === "awaiting_confirmation"
            ? 3
            : 4,
    requestKey: "DEMO_CREATE_" + key,
  });
  const requests = [
    make(
      "YC01",
      "truongca",
      "kythuat",
      "repair",
      "X01",
      "M01",
      "",
      "Máy trộn rung khi chạy tải",
      "new",
      "",
      "",
    ),
    make(
      "YC02",
      "congnhan",
      "kythuat",
      "repair",
      "X01",
      "M01",
      "BP02",
      "Kiểm tra tiếng ồn hộp giảm tốc",
      "in_progress",
      "cokhi",
      "",
    ),
    make(
      "YC03",
      "pcn",
      "kythuat",
      "repair",
      "X01",
      "M02",
      "BP03",
      "Nhiệt độ hàn túi không ổn định",
      "awaiting_confirmation",
      "tudonghoa",
      "03",
    ),
    make(
      "YC04",
      "truongca",
      "cokhi",
      "repair",
      "X02",
      "M03",
      "BP05",
      "Còn rò rỉ dầu tại đầu bơm",
      "rework",
      "kythuat",
      "04",
    ),
    make(
      "YC05",
      "congnhan",
      "tudonghoa",
      "maintenance",
      "X01",
      "M02",
      "BP04",
      "Vệ sinh và căn chỉnh băng tải",
      "completed",
      "cokhi",
      "05",
    ),
  ];
  const report = (number, req, actor, status, content) => ({
    id: "DEMO_BC_" + number,
    requestId: "DEMO_MOBILE_" + req,
    ordinal: 1,
    status,
    createdBy: "mau." + actor,
    createdByName: names["mau." + actor],
    actualBy: "mau." + actor,
    actualByName: names["mau." + actor],
    actualRole: roles.find((r) => r[0] === actor)[1],
    content: "[MẪU] " + content,
    performedDate: offset(-1),
    checks: "[]",
    photos: "[]",
    createdAt: at(-2),
    submittedAt: status === "draft" ? "" : at(-1, "03"),
    revision: status === "draft" ? 1 : status === "submitted" ? 2 : 3,
    draftKey: "DEMO_DRAFT_" + number,
    submitKey: status === "draft" ? "" : "DEMO_SUBMIT_" + number,
    baseRevision: 2,
    scheduleId: "",
    scheduleRevision: "",
    scheduleDue: "",
    scheduleInterval: "",
    scheduleUnit: "",
    checklist: "[]",
  });
  const review = (number, req, creator, decision, reason) => ({
    id: "DEMO_XN_" + number,
    requestId: "DEMO_MOBILE_" + req,
    reportId: "DEMO_BC_" + number,
    decision,
    reason,
    createdBy: "mau." + creator,
    createdByName: names["mau." + creator],
    createdAt: at(-1, "04"),
    reviewKey: "DEMO_REVIEW_" + number,
    processed: true,
    calendarResult: decision === "accept" ? "not_linked" : "",
  });
  return {
    Account: roles.map(([key, role, name]) => ({
      useName: "mau." + key,
      passWord: passwords[key],
      role,
      name: "[MẪU] " + name,
      email: "",
    })),
    Requests: requests,
    ServiceReports: [
      report(
        "02",
        "YC02",
        "cokhi",
        "draft",
        "Đang kiểm tra cơ cấu truyền động.",
      ),
      report(
        "03",
        "YC03",
        "tudonghoa",
        "submitted",
        "Đã thay cảm biến và chạy thử, chờ người yêu cầu kiểm tra.",
      ),
      report(
        "04",
        "YC04",
        "kythuat",
        "rejected",
        "Đã siết lại đầu nối, cần kiểm tra thêm vị trí rò dầu.",
      ),
      report(
        "05",
        "YC05",
        "cokhi",
        "accepted",
        "Đã vệ sinh, căn chỉnh băng tải và chạy thử ổn định.",
      ),
    ],
    ServiceReviews: [
      review(
        "04",
        "YC04",
        "truongca",
        "reject",
        "[MẪU] Vẫn còn rò dầu khi máy chạy tải, đề nghị khắc phục lại.",
      ),
      review(
        "05",
        "YC05",
        "congnhan",
        "accept",
        "[MẪU] Đã kiểm tra, máy hoạt động ổn định.",
      ),
    ],
    Notifications: [
      {
        id: "DEMO_MOBILE_NOTICE_03",
        date: today,
        kind: "app",
        recipient: "mau.pcn",
        status: "unread",
        message:
          "[MẪU] Có kết quả chờ xác nhận: Nhiệt độ hàn túi không ổn định.",
        sentAt: at(-1, "03"),
        requestId: "DEMO_MOBILE_YC03",
      },
      {
        id: "DEMO_MOBILE_NOTICE_04",
        date: today,
        kind: "app",
        recipient: "mau.kythuat",
        status: "unread",
        message: "[MẪU] Người yêu cầu cần khắc phục lại vị trí rò dầu.",
        sentAt: at(-1, "04"),
        requestId: "DEMO_MOBILE_YC04",
      },
    ],
  };
}
function seedMobileRequests_() {
  const schema = setupMobileRequests_(),
    assets = rows_("Assets");
  if (
    !["DEMO_M01", "DEMO_M02", "DEMO_M03"].every((id) =>
      assets.some((a) => a.id === id),
    )
  )
    throw Error(
      "Cần có ba máy mẫu. Chạy taoDuLieuMauThietBi trước khi thêm phiếu mẫu mobile.",
    );
  const passwords = {};
  ["truongca", "congnhan", "pcn", "kythuat", "cokhi", "tudonghoa"].forEach(
    (key) =>
      (passwords[key] =
        "Mb-" + Utilities.getUuid().replace(/-/g, "").slice(0, 16)),
  );
  const data = mobileDemoData_(today_(), passwords),
    counts = {},
    credentials = [];
  Object.keys(data).forEach((name) => {
    const key = EQUIPMENT_SHEETS[name][0],
      existing = new Set(
        rows_(name).map((r) => String(r[key]).trim().toLowerCase()),
      );
    counts[EQUIPMENT_STORAGE[name].sheet] = 0;
    data[name].forEach((record) => {
      const id = String(record[key]).trim().toLowerCase();
      if (existing.has(id)) return;
      write_(name, record);
      existing.add(id);
      counts[EQUIPMENT_STORAGE[name].sheet]++;
      if (name === "Account")
        credentials.push({
          tenDangNhap: record.useName,
          matKhau: record.passWord,
          chucVu: record.role,
        });
    });
  });
  const accepted = rows_("ServiceReviews").find((v) => v.id === "DEMO_XN_05");
  if (
    accepted &&
    !rows_("Jobs").some((j) => j.id === "MOBILE_DEMO_MOBILE_YC05")
  )
    mobileApplyReview_(accepted);
  const p = props_();
  if (!p.getProperty("PHOTO_FOLDER"))
    p.setProperty(
      "PHOTO_FOLDER",
      DriveApp.createFolder("DMG_AnhBaoTriThietBi").getId(),
    );
  const ss = db_();
  ["Requests", "ServiceReports", "ServiceReviews", "Account"].forEach(
    (name) => {
      const sheet = equipmentSheet_(ss, name);
      sheet.setFrozenRows(1);
      sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .setFontWeight("bold")
        .setBackground("#dcefe4");
      sheet.autoResizeColumns(1, sheet.getLastColumn());
    },
  );
  SpreadsheetApp.flush();
  return {
    success: true,
    schemaChecks: schema.checks,
    counts,
    credentials,
    totals: {
      requests: rows_("Requests").length,
      reports: rows_("ServiceReports").length,
      reviews: rows_("ServiceReviews").length,
      accounts: rows_("Account").length,
    },
    mobileUrl: equipmentMobileUrl_(),
    note: "Mẫu có nhãn [MẪU]. Không gửi email, không tạo ảnh giả và không đổi mật khẩu tài khoản có sẵn.",
  };
}
function taoDuLieuMauMobile() {
  requireSetupOwner_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const result = seedMobileRequests_();
    console.log(JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}
