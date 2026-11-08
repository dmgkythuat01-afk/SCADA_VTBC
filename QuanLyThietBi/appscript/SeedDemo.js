/** Owner-only sample importer. It never replaces existing records or sends mail. */
function taoDuLieuMauThietBi() {
  requireSetupOwner_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const result = seedEquipmentDemo_();
    console.log(JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function equipmentDemoRows_(today, passwords, ownerEmail, appUrl) {
  const at = today + "T02:00:00.000Z";
  const offset = (n) => {
    const d = validDate_(today);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const asset = (
    id,
    type,
    parentId,
    name,
    code,
    purpose,
    details,
    checklist,
  ) => ({
    id: "DEMO_" + id,
    type,
    parentId: parentId ? "DEMO_" + parentId : "",
    name: "[MẪU] " + name,
    code,
    purpose,
    details,
    checklist: JSON.stringify(checklist || []),
    active: true,
    updatedAt: at,
    updatedBy: "demo.admin",
    revision: 1,
  });
  const schedule = (
    id,
    component,
    name,
    interval,
    unit,
    dueDate,
    checklist,
  ) => ({
    id: "DEMO_" + id,
    componentId: "DEMO_" + component,
    name: "[MẪU] " + name,
    interval,
    unit,
    dueDate,
    assignee: "demo.kt",
    checklist: JSON.stringify(checklist),
    active: true,
    updatedAt: at,
    revision: 1,
  });
  const job = (
    id,
    component,
    scheduleId,
    type,
    title,
    status,
    completedDate,
    result,
  ) => ({
    id: "DEMO_" + id,
    componentId: "DEMO_" + component,
    scheduleId: scheduleId ? "DEMO_" + scheduleId : "",
    type,
    title: "[MẪU] " + title,
    description: "Dữ liệu minh họa, không phải sự cố thực tế.",
    assignee: "demo.kt",
    status,
    openedAt: offset(-7) + "T02:00:00.000Z",
    openedBy: "demo.admin",
    completedDate: completedDate || "",
    completedAt: completedDate ? completedDate + "T03:00:00.000Z" : "",
    completedBy: completedDate ? "demo.kt" : "",
    result: result
      ? JSON.stringify({
          text: result,
          checks: type === "maintenance" ? [true, true] : [],
        })
      : "",
    photos: "[]",
    requestId: "DEMO_OPEN_" + id,
    revision: completedDate ? 2 : 1,
    completionRequestId: completedDate ? "DEMO_DONE_" + id : "",
  });
  return {
    Account: [
      {
        useName: "demo.admin",
        passWord: passwords.admin,
        role: "admin",
        name: "[MẪU] Quản trị thiết bị",
      },
      {
        useName: "demo.kt",
        passWord: passwords.technician,
        role: "Kỹ thuật bảo trì",
        name: "[MẪU] Nhân viên kỹ thuật",
      },
    ],
    Assets: [
      asset(
        "X01",
        "workshop",
        "",
        "Xưởng Viên giặt",
        "XVG",
        "Sản xuất viên giặt",
        "Xưởng minh họa",
      ),
      asset(
        "X02",
        "workshop",
        "",
        "Xưởng Viên treo bồn cầu",
        "XVT",
        "Sản xuất viên treo",
        "Xưởng minh họa",
      ),
      asset(
        "KV01",
        "area",
        "X01",
        "Khu vực phối trộn",
        "PT",
        "Chuẩn bị hỗn hợp",
        "Tầng 1, phía Đông",
      ),
      asset(
        "KV02",
        "area",
        "X01",
        "Khu vực đóng gói",
        "DG",
        "Đóng gói thành phẩm",
        "Tầng 1, phía Tây",
      ),
      asset(
        "KV03",
        "area",
        "X02",
        "Khu vực tạo hình",
        "TH",
        "Ép và tạo hình sản phẩm",
        "Khu vực minh họa",
      ),
      asset(
        "M01",
        "machine",
        "KV01",
        "Máy trộn 500 kg",
        "MT-500",
        "Trộn đồng đều nguyên liệu",
        "Dung tích 500 lít; động cơ 15 kW",
      ),
      asset(
        "M02",
        "machine",
        "KV02",
        "Máy đóng gói tự động",
        "MDG-01",
        "Đóng túi và hàn miệng túi",
        "Nguồn điện 220 V; tốc độ minh họa 30 túi/phút",
      ),
      asset(
        "M03",
        "machine",
        "KV03",
        "Máy ép tạo hình",
        "ME-01",
        "Tạo hình viên treo",
        "Nguồn điện 380 V; hệ thủy lực",
      ),
      asset(
        "BP01",
        "component",
        "M01",
        "Động cơ truyền động",
        "DC-MT01",
        "Dẫn động cánh trộn",
        "Motor 3 pha 15 kW; 380 V",
        ["Kiểm tra tiếng ồn", "Kiểm tra nhiệt độ", "Kiểm tra bulông chân đế"],
      ),
      asset(
        "BP02",
        "component",
        "M01",
        "Hộp giảm tốc",
        "HGT-MT01",
        "Giảm tốc độ cánh trộn",
        "Tỉ số truyền mẫu 1:20",
        ["Kiểm tra mức dầu", "Kiểm tra rò rỉ dầu"],
      ),
      asset(
        "BP03",
        "component",
        "M02",
        "Bộ gia nhiệt hàn túi",
        "GN-DG01",
        "Hàn kín miệng túi",
        "Thanh nhiệt, cảm biến nhiệt và bộ điều khiển",
        ["Kiểm tra nhiệt độ", "Kiểm tra chất lượng đường hàn"],
      ),
      asset(
        "BP04",
        "component",
        "M02",
        "Băng tải cấp liệu",
        "BT-DG01",
        "Đưa túi vào vị trí đóng gói",
        "Dây băng PVC; chiều dài minh họa 2 m",
        ["Kiểm tra độ căng băng", "Kiểm tra con lăn"],
      ),
      asset(
        "BP05",
        "component",
        "M03",
        "Bơm thủy lực",
        "BOM-TH01",
        "Cấp áp suất cho cơ cấu ép",
        "Áp suất minh họa 80 bar",
        ["Kiểm tra áp suất", "Kiểm tra mức dầu"],
      ),
      asset(
        "BP06",
        "component",
        "M03",
        "Tủ điện điều khiển",
        "TD-TH01",
        "Điều khiển máy ép",
        "PLC, khởi động từ và nguồn 24 VDC",
        ["Vệ sinh bụi", "Kiểm tra đầu nối"],
      ),
    ],
    Schedules: [
      schedule(
        "L01",
        "BP01",
        "Kiểm tra và bôi trơn vòng bi",
        1,
        "week",
        offset(-3),
        ["Kiểm tra tiếng ồn", "Bôi trơn vòng bi"],
      ),
      schedule(
        "L02",
        "BP02",
        "Kiểm tra mức dầu hộp số",
        1,
        "month",
        offset(5),
        ["Kiểm tra mức dầu", "Kiểm tra điểm rò rỉ"],
      ),
      schedule("L03", "BP03", "Kiểm tra cụm gia nhiệt", 2, "week", offset(12), [
        "Đo nhiệt độ",
        "Chạy thử đường hàn",
      ]),
      schedule(
        "L04",
        "BP04",
        "Căn chỉnh băng tải",
        1,
        "month",
        nextDue_(offset(-2), 1, "month"),
        ["Căn độ căng", "Kiểm tra con lăn"],
      ),
      schedule("L05", "BP05", "Kiểm tra hệ thủy lực", 3, "month", offset(30), [
        "Kiểm tra áp suất",
        "Kiểm tra mức dầu",
      ]),
      schedule("L06", "BP06", "Vệ sinh tủ điện", 1, "month", today, [
        "Vệ sinh bụi",
        "Siết kiểm tra đầu nối",
      ]),
    ],
    Jobs: [
      job(
        "CV01",
        "BP03",
        "",
        "repair",
        "Thay cảm biến nhiệt hàn túi",
        "completed",
        offset(-3),
        "Đã thay cảm biến mẫu, kiểm tra đường hàn ổn định.",
      ),
      job(
        "CV02",
        "BP04",
        "L04",
        "maintenance",
        "Căn chỉnh băng tải định kỳ",
        "completed",
        offset(-2),
        "Đã căn chỉnh băng tải, vệ sinh con lăn và chạy thử.",
      ),
      job(
        "CV03",
        "BP05",
        "",
        "repair",
        "Kiểm tra tiếng ồn bất thường của bơm",
        "open",
        "",
        "",
      ),
      job(
        "CV04",
        "BP01",
        "L01",
        "maintenance",
        "Bôi trơn vòng bi động cơ",
        "in_progress",
        "",
        "",
      ),
    ],
    Settings: [
      { key: "reportEmails", value: ownerEmail },
      { key: "appUrl", value: appUrl },
      {
        key: "sampleDataNote",
        value:
          "Các dòng có tiền tố DEMO_ hoặc [MẪU] là dữ liệu minh họa. Không có email thử nào được gửi khi nhập mẫu.",
      },
    ],
    Notifications: [
      {
        id: "DEMO_NOTICE_01",
        date: today,
        kind: "demo",
        recipient: "[MẪU] Chưa gửi email",
        status: "demo",
        message: "Dòng minh họa nhật ký; không có thư nào được gửi.",
        sentAt: "",
      },
    ],
    Audit: [
      {
        id: "DEMO_AUDIT_01",
        at,
        email: "demo.admin",
        action: "sample_import",
        entity: "DEMO_DATASET",
        details: JSON.stringify({
          sample: true,
          description:
            "Nhập dữ liệu minh họa xưởng, máy, bộ phận, lịch và công việc.",
        }),
      },
    ],
  };
}

function seedEquipmentDemo_() {
  ensureStore_();
  Object.keys(EQUIPMENT_SHEETS).forEach((name) => {
    const expected = EQUIPMENT_SHEETS[name],
      actual = db_()
        .getSheetByName(name)
        .getRange(1, 1, 1, expected.length)
        .getValues()[0];
    if (
      expected.some(
        (value, index) => String(actual[index] || "").trim() !== value,
      )
    )
      throw Error(
        "Tiêu đề sheet " + name + " chưa đúng cấu trúc. Chưa nhập dữ liệu mẫu.",
      );
  });
  const passwords = {
    admin: "DmG-" + Utilities.getUuid().replace(/-/g, "").slice(0, 16),
    technician: "Kt-" + Utilities.getUuid().replace(/-/g, "").slice(0, 16),
  };
  const ownerEmail = Session.getEffectiveUser().getEmail();
  const url =
    "https://script.google.com/macros/s/AKfycbxySBhZ2vOCKpWAgPOj8IlsIRCnH0HjkPxbzPr6pF5VsHuyL_RTDmJQfh4dKjCeVfRvKg/exec";
  const fixture = equipmentDemoRows_(today_(), passwords, ownerEmail, url),
    counts = {},
    credentials = [];
  Object.keys(fixture).forEach((name) => {
    const key = EQUIPMENT_SHEETS[name][0],
      existing = rows_(name),
      keys = new Set(
        existing.map((row) => String(row[key]).trim().toLowerCase()),
      );
    counts[name] = 0;
    fixture[name].forEach((record) => {
      if (keys.has(String(record[key]).trim().toLowerCase())) return;
      write_(name, record);
      keys.add(String(record[key]).trim().toLowerCase());
      counts[name]++;
      if (name === "Account")
        credentials.push({
          useName: record.useName,
          passWord: record.passWord,
          role: record.role,
        });
    });
  });
  if (!props_().getProperty("PHOTO_FOLDER"))
    props_().setProperty(
      "PHOTO_FOLDER",
      DriveApp.createFolder("DMG_AnhBaoTriThietBi").getId(),
    );
  const ss = db_();
  Object.keys(fixture).forEach((name) => {
    const sheet = ss.getSheetByName(name);
    sheet.setFrozenRows(1);
    sheet
      .getRange(1, 1, 1, EQUIPMENT_SHEETS[name].length)
      .setFontWeight("bold")
      .setBackground("#dcefe4");
    sheet.autoResizeColumns(1, EQUIPMENT_SHEETS[name].length);
  });
  SpreadsheetApp.flush();
  ss.setActiveSheet(ss.getSheetByName("Assets"));
  ss.moveActiveSheet(1);
  ss.setActiveSheet(ss.getSheetByName("Account"));
  ss.moveActiveSheet(2);
  ss.setActiveSheet(ss.getSheetByName("Assets"));
  const totals = {};
  Object.keys(fixture).forEach((name) => (totals[name] = rows_(name).length));
  return {
    success: true,
    spreadsheet: ss.getUrl(),
    counts,
    totals,
    credentials,
    note: "Không ghi đè dữ liệu cũ. Không gửi email thử. Các công việc mẫu chưa đính kèm ảnh giả.",
  };
}
