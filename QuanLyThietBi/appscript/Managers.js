function optionalEquipmentEmail_(value) {
  const email = String(value == null ? "" : value)
    .trim()
    .toLowerCase();
  if (email && (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)))
    throw Error("Email không hợp lệ.");
  return email;
}
function saveManager_(user, p) {
  admin_(user);
  const old = p.id ? rows_("Managers").find((row) => row.id === p.id) : null;
  if (p.id && !old) throw Error("Không tìm thấy người quản lý.");
  checkRevision_(old, p);
  const active = p.active !== false;
  if (
    old &&
    !active &&
    rows_("Assets").some(
      (a) => a.type === "machine" && a.managerId === old.id && enabled_(a),
    )
  )
    throw Error(
      "Người này đang quản lý máy. Hãy đổi người quản lý của các máy trước khi ngừng sử dụng.",
    );
  const record = Object.assign(old || { id: id_() }, {
    name: required_(p.name, "họ tên người quản lý", 200),
    email: optionalEquipmentEmail_(p.email),
    phone: text_(p.phone, 50),
    position: text_(p.position, 150),
    active,
    updatedAt: now_(),
    revision: Number((old && old.revision) || 0) + 1,
  });
  write_("Managers", record);
  audit_(user, "saveManager", record.id);
  return record;
}
function machineManagerId_(type, old, p) {
  if (type !== "machine") return "";
  const id =
    p.managerId === undefined && old
      ? text_(old.managerId)
      : text_(p.managerId);
  if (!id) throw Error("Vui lòng chọn người quản lý máy.");
  const manager = rows_("Managers").find((m) => m.id === id);
  if (!manager || !enabled_(manager))
    throw Error("Người quản lý không tồn tại hoặc đã ngừng sử dụng.");
  return id;
}
/** Append only new Vietnamese fields/table. Existing usernames, passwords and IDs stay unchanged. */
function setupMachineManagers_() {
  const ss = db_(),
    before = ["Assets", "Account"]
      .map((key) => {
        const sheet = equipmentSheet_(ss, key);
        return sheet
          ? {
              key,
              width: sheet.getLastColumn(),
              rows: sheet.getLastRow(),
              digest: equipmentDataDigest_(sheet.getDataRange().getValues()),
            }
          : null;
      })
      .filter(Boolean);
  ensureStore_();
  SpreadsheetApp.flush();
  const checks = before.map((state) => {
    const sheet = equipmentSheet_(ss, state.key),
      values = sheet.getRange(1, 1, state.rows, state.width).getValues();
    if (
      sheet.getLastRow() !== state.rows ||
      equipmentDataDigest_(values) !== state.digest
    )
      throw Error(
        "Cần kiểm tra dữ liệu " +
          EQUIPMENT_STORAGE[state.key].sheet +
          " do thay đổi đồng thời.",
      );
    return {
      sheet: EQUIPMENT_STORAGE[state.key].sheet,
      preserved: true,
      rows: Math.max(0, state.rows - 1),
    };
  });
  return {
    success: true,
    sheet: EQUIPMENT_STORAGE.Managers.sheet,
    assetColumn: "maNguoiQuanLy",
    accountColumn: "email",
    checks,
    counts: {
      machines: rows_("Assets").filter((a) => a.type === "machine").length,
      managers: rows_("Managers").length,
      accounts: rows_("Account").length,
    },
  };
}
function capNhatCauTrucNguoiQuanLy() {
  requireSetupOwner_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return setupMachineManagers_();
  } finally {
    lock.releaseLock();
  }
}
