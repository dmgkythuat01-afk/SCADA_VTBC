function mobileWorkAppendAdminHistory_(request, report, review) {
  const name =
      request.type === "maintenance" ? "LichSuBaoDuong" : "LichSuSuaChua",
    id = "MOBILE_" + request.id,
    existing = maintenanceRows_(name).find((h) => h.maLichSu === id);
  if (existing) return existing;
  const source = mobileWorkParse_(report.criteriaSnapshot, []),
    actual = mobileWorkParse_(report.actualResults, []),
    checks = mobileWorkParse_(report.checks, []),
    criteria = source.map((c, i) => ({
      chiTieu: c.danhMucCanKiemTra,
      tieuChuan: c.thongSoTieuChuan,
      ketQuaThucTe: actual[i] || "",
      ketLuan: checks[i] ? "Đạt" : "Không đạt",
    })),
    row = {
      maLichSu: id,
      maHoSo:
        request.deviceKey ||
        maintenanceDeviceKey_({
          tenXuong: request.workshopName,
          tenMay: request.machineName,
          maThietBi: request.deviceCode || "",
        }),
      tenXuong: request.workshopName,
      tenMay: request.machineName,
      maThietBi: request.deviceCode || "",
      tenThietBi: request.deviceName || "Toàn máy",
      ngayThucHien: report.performedDate,
      hoanThanh: "true",
      nguoiThucHien: report.actualBy,
      tenNguoiThucHien: report.actualByName,
      moTaLoi: request.type === "repair" ? request.description : "",
      noiDung: request.title + "\n" + report.content,
      ketQua: report.content,
      chiTietKiemTra: JSON.stringify(criteria),
      danhSachAnh: JSON.stringify(
        mobileWorkParse_(report.photos, []).map((p) => ({
          id: p.id,
          name: p.name,
        })),
      ),
      nguoiGhiNhan: review.createdBy,
      tenNguoiGhiNhan: review.createdByName,
      thoiGianGhiNhan: adminNow_(),
      maYeuCau: "MOBILE_ACCEPT_" + request.id,
      dauVanTay: adminHmac_(
        JSON.stringify([request.id, report.id, review.id]),
        adminSecret_(),
      ),
    };
  maintenanceWrite_(name, row);
  mobileWorkGetContext_().catalog = null;
  return row;
}
function mobileWorkProtectReference_(name, row) {
  if (
    !["DanhMucXuong", "DanhMucMay", "DanhMucThietBi"].includes(name) ||
    !mobileWorkTable_("Requests", true)
  )
    return;
  const requests = mobileWorkReadTable_("Requests"),
    used = requests.filter((r) => {
      if (name === "DanhMucXuong")
        return adminNorm_(r.workshopName) === adminNorm_(row.tenXuong);
      if (name === "DanhMucMay")
        return (
          adminNorm_(r.workshopName) === adminNorm_(row.tenXuong) &&
          adminNorm_(r.machineName) === adminNorm_(row.tenMay)
        );
      return r.componentId && r.deviceKey === maintenanceDeviceKey_(row);
    });
  if (used.length)
    throw Error(
      "Danh mục đang liên kết với " +
        used.length +
        " phiếu yêu cầu mobile. Giữ nguyên mã/vị trí để bảo toàn phiếu và lịch sử.",
    );
}
function mobileWorkReconcileIfReady_() {
  if (!mobileWorkTable_("Requests", true)) return;
  mobileWorkResetContext_();
  mobileWorkReconcile_();
}
