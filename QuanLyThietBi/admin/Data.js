function adminKey_(name, row) {
  return JSON.stringify(adminSpec_(name).key.map((k) => adminNorm_(row[k])));
}
function currentAdminRow_(name, p) {
  if (!p._row) return null;
  const row = readAdminRows_(name).find((r) => r._row === Number(p._row));
  if (!row || adminRowVersion_(name, row) !== p._version)
    throw Error(
      "Dòng đã thay đổi hoặc bị xóa. Hãy tải lại dữ liệu trước khi lưu.",
    );
  return row;
}
function adminDate_(date) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    isNaN(new Date(date + "T00:00:00Z").getTime()) ||
    new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date
  )
    throw Error("Ngày lắp đặt không hợp lệ.");
}
function adminSame_(a, b, keys) {
  return keys.every((k) => adminNorm_(a[k]) === adminNorm_(b[k]));
}
function adminChanged_(a, b, keys) {
  return keys.some((k) => String(a[k] || "") !== String(b[k] || ""));
}
function adminReference_(name, row) {
  if (typeof mobileWorkProtectReference_ === "function")
    mobileWorkProtectReference_(name, row);
  if (typeof maintenanceProtectReference_ === "function")
    maintenanceProtectReference_(name, row);
  let used = [];
  if (name === "TaiKhoan")
    used = readAdminRows_("DanhMucThietBi").filter(
      (r) =>
        (row.maNhanVien &&
          adminNorm_(r.maNguoiQuanLy) === adminNorm_(row.maNhanVien)) ||
        (!r.maNguoiQuanLy &&
          row.hoTen &&
          adminNorm_(r.tenNguoiQuanLy) === adminNorm_(row.hoTen)),
    );
  if (name === "DanhMucBoPhan")
    used = readAdminRows_("DanhMucThietBi").filter(
      (r) => adminNorm_(r.tenBoPhanQuanLy) === adminNorm_(row.tenBoPhanQuanLy),
    );
  if (name === "DanhMucXuong")
    used = ["DanhMucMay", "DanhMucThietBi", "DanhMucCanKiemTra", "DanhMucSoKH"].flatMap((n) =>
      readAdminRows_(n).filter((r) => adminSame_(r, row, ["tenXuong"])),
    );
  if (name === "DanhMucMay")
    used = ["DanhMucThietBi", "DanhMucCanKiemTra", "DanhMucSoKH"].flatMap((n) =>
      readAdminRows_(n).filter((r) =>
        adminSame_(r, row, ["tenXuong", "tenMay"]),
      ),
    );
  if (name === "DanhMucThietBi")
    used = ["DanhMucCanKiemTra","DanhMucSoKH"].flatMap(n=>readAdminRows_(n)).filter((r) =>
      adminSame_(r, row, ["tenXuong", "tenMay", "maThietBi"]),
    );
  if (used.length)
    throw Error(
      "Mục này đang được " +
        used.length +
        " dòng danh mục khác sử dụng. Hãy chuyển hoặc xóa các liên kết trước.",
    );
}
function protectLastAdmin_(old, next) {
  if (
    old &&
    isAdminRole_(old.chucVu) &&
    (!next || !isAdminRole_(next.chucVu)) &&
    readAdminRows_("TaiKhoan").filter(
      (r) => isAdminRole_(r.chucVu) && r.matKhau,
    ).length <= 1
  )
    throw Error("Phải giữ ít nhất một tài khoản quản trị.");
}
function prepareAdminData_(name, p, read = readAdminRows_, plans) {
  const spec = adminSpec_(name),
    old = currentAdminRow_(name, p),
    values = p.values || {},
    row = { ...(old || {}) };
  Object.keys(spec.columns).forEach((k) => {
    if (k === "matKhau") return;
    if (values[k] !== undefined)
      row[k] = adminText_(
        values[k],
        [
          "ThongSoKyThuat",
          "congDung",
          "danhMucCanKiemTra",
          "thamSoCanKiemTra",
          "chiTieuDanhGia1",
          "chiTieuDanhGia2",
          "chiTieuDanhGia3",
        ].includes(k)
          ? 10000
          : 500,
      );
    else if (!old) row[k] = "";
  });
  spec.required.forEach((k) => {
    if (!row[k])
      throw Error("Vui lòng nhập " + spec.columns[k].toLowerCase() + ".");
  });
  if (name === "DanhMucCanKiemTra") {
    const matches = read("DanhMucThietBi").filter((r) =>
      adminSame_(r, row, ["tenXuong", "tenMay", "maThietBi"]),
    );
    if (matches.length !== 1)
      throw Error("Thiết bị không thuộc xưởng/máy đã chọn.");
    row.maThietBi = matches[0].maThietBi;
    row.tenThietBi = matches[0].tenThietBi || "";
  }
  if(name==='DanhMucSoKH')equipmentPlanCatalogValidate_(row,read);
  const all = read(name);
  if (name === "DanhMucCanKiemTra" && !["Điện", "Cơ khí"].includes(row.boPhanDanhGia))
    throw Error("Bộ phận đánh giá chỉ được chọn Điện hoặc Cơ khí.");
  if (name === "DanhMucCanKiemTra") {
    const parameters=equipmentSystemParameters_();
    for (const key of ["loai"]) {
      if (!parameters[key].includes(row[key])) throw Error(spec.columns[key]+" phải chọn từ sheet ThamSoHeThong hiện tại.");
    }
    row.tanSuatThamSo=equipmentPlanSelection_(row,old,plans);
  }
  if (
    all.some(
      (r) =>
        r._row !== (old && old._row) &&
        adminKey_(name, r) === adminKey_(name, row),
    )
  )
    throw Error("Thông tin đã tồn tại trong danh mục.");
  if (name === "TaiKhoan") {
    if (/\s/.test(row.tenDangNhap))
      throw Error("Tên đăng nhập không được chứa khoảng trắng.");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
      throw Error("Email không hợp lệ.");
    if (
      row.maNhanVien &&
      all.some(
        (r) =>
          r._row !== (old && old._row) &&
          adminNorm_(r.maNhanVien) === adminNorm_(row.maNhanVien),
      )
    )
      throw Error("Mã nhân viên đã được dùng.");
    const password = values.matKhau === undefined ? "" : String(values.matKhau);
    row.matKhau = password
      ? hashAdminPassword_(password)
      : (old && old.matKhau) || "";
    if (!row.matKhau) throw Error("Vui lòng nhập mật khẩu cho tài khoản mới.");
    protectLastAdmin_(old, row);
    if (old && adminChanged_(old, row, ["maNhanVien", "hoTen"]))
      adminReference_(name, old);
  }
  if (name === "DanhMucBoPhan") {
    if (
      all.some(
        (r) =>
          r._row !== (old && old._row) &&
          adminNorm_(r.tenBoPhanQuanLy) === adminNorm_(row.tenBoPhanQuanLy),
      )
    )
      throw Error("Tên bộ phận quản lý đã tồn tại.");
    if (old && adminChanged_(old, row, ["tenBoPhanQuanLy"]))
      adminReference_(name, old);
  }
  if (
    old &&
    ["DanhMucXuong", "DanhMucMay", "DanhMucThietBi"].includes(name) &&
    adminChanged_(old, row, spec.key)
  )
    adminReference_(name, old);
  if (["DanhMucMay", "DanhMucThietBi", "DanhMucCanKiemTra", "DanhMucSoKH"].includes(name)) {
    const matches = read("DanhMucXuong").filter(
      (r) => adminNorm_(r.tenXuong) === adminNorm_(row.tenXuong),
    );
    if (matches.length !== 1)
      throw Error("Vui lòng chọn xưởng có trong danh mục.");
    row.tenXuong = matches[0].tenXuong;
  }
  if (["DanhMucThietBi", "DanhMucCanKiemTra", "DanhMucSoKH"].includes(name)) {
    const matches = read("DanhMucMay").filter((r) =>
      adminSame_(r, row, ["tenXuong", "tenMay"]),
    );
    if (matches.length !== 1)
      throw Error("Vui lòng chọn máy thuộc xưởng đã chọn.");
    row.tenMay = matches[0].tenMay;
  }
  if (name === "DanhMucThietBi") {
    if (
      row.soLuong &&
      (!/^\d+$/.test(row.soLuong) || !Number.isSafeInteger(Number(row.soLuong)))
    )
      throw Error("Số lượng phải là số nguyên không âm.");
    if (row.ngayLapDat) adminDate_(row.ngayLapDat);
    if (row.maNguoiQuanLy) {
      const matches = read("TaiKhoan").filter(
        (r) =>
          r.maNhanVien &&
          adminNorm_(r.maNhanVien) === adminNorm_(row.maNguoiQuanLy),
      );
      if (matches.length !== 1)
        throw Error("Mã người quản lý không có hoặc bị trùng trong Tài khoản.");
      row.maNguoiQuanLy = matches[0].maNhanVien;
      row.tenNguoiQuanLy = matches[0].hoTen;
    } else {
      if (row.tenNguoiQuanLy)
        throw Error("Vui lòng chọn mã nhân viên tương ứng với người quản lý.");
      row.tenNguoiQuanLy = "";
    }
    if (row.tenBoPhanQuanLy) {
      const matches = read("DanhMucBoPhan").filter(
        (r) =>
          adminNorm_(r.tenBoPhanQuanLy) === adminNorm_(row.tenBoPhanQuanLy),
      );
      if (matches.length !== 1)
        throw Error("Bộ phận quản lý chưa có trong danh mục.");
      row.tenBoPhanQuanLy = matches[0].tenBoPhanQuanLy;
    }
    row.ThoiGianCapNhat = adminNow_();
  }
  return row;
}
function saveAdminData_(name, p) {
  const row = prepareAdminData_(name, p);
  writeAdminRow_(name, row, p._row ? Number(p._row) : undefined);
  return row;
}
function saveAdminBatch_(name, values) {
  if (!["DanhMucThietBi", "DanhMucCanKiemTra", "DanhMucSoKH"].includes(name))
    throw Error("Chỉ hỗ trợ thêm danh sách thiết bị hoặc danh mục kiểm tra.");
  if (!Array.isArray(values) || values.length < 1 || values.length > 100)
    throw Error("Danh sách cần có từ 1 đến 100 dòng.");
  const tables = {},
    prepared = [];
  const plans=name==='DanhMucCanKiemTra'?equipmentPlanCategories_():undefined;
  const read = (table) =>
    tables[table] || (tables[table] = readAdminRows_(table));
  values.forEach((item, index) => {
    try {
      if (!item || typeof item !== "object" || Array.isArray(item))
        throw Error("Dữ liệu không hợp lệ.");
      const row = prepareAdminData_(name, { values: item }, read, plans);
      prepared.push(row);
      read(name).push({ ...row, _row: -(index + 1) });
    } catch (error) {
      throw Error("Dòng " + (index + 1) + ": " + error.message);
    }
  });
  writeAdminBatch_(name, prepared);
  return { success: true, count: prepared.length };
}
function deleteAdminData_(name, p) {
  const old = currentAdminRow_(name, p);
  if (!old) throw Error("Không tìm thấy dòng cần xóa.");
  if (name === "TaiKhoan") protectLastAdmin_(old, null);
  adminReference_(name, old);
  deleteAdminRow_(name, old._row);
  return { success: true };
}
