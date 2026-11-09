function maintenanceNorm_(value) {
  return String(value == null ? "" : value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}
function maintenanceDeviceKey_(device) {
  return JSON.stringify(
    [device.tenXuong, device.tenMay, device.maThietBi].map((value) =>
      String(value == null ? "" : value)
        .trim()
        .toLocaleLowerCase("vi"),
    ),
  );
}
function maintenanceDate_(value) {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw Error("Ngày không hợp lệ.");
  const date = new Date(text + "T00:00:00Z");
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text)
    throw Error("Ngày không hợp lệ.");
  return date;
}
function maintenanceAddDays_(date, days) {
  const d = maintenanceDate_(date);
  if (!Number.isInteger(Number(days))) throw Error("Số ngày không hợp lệ.");
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}
function maintenanceCompleted_(value) {
  return ["true", "1", "co", "hoan thanh"].includes(maintenanceNorm_(value));
}
function maintenanceActive_(device) {
  return ![
    "false",
    "0",
    "no",
    "khong",
    "khong su dung",
    "ngung su dung",
    "ngung hoat dong",
    "disabled",
  ].includes(maintenanceNorm_(device.dangSuDung));
}
function maintenanceProjection_(device, history, today) {
  maintenanceDate_(today);
  const result = {
    ...device,
    maHoSo: maintenanceDeviceKey_(device),
    ngayBaoDuongGanNhat: "",
    ngayDenHan: "",
    soNgayConLai: null,
    nguonLich: "",
    trangThai: "unconfigured",
    lyDo: "",
  };
  if (!maintenanceActive_(device)) {
    result.trangThai = "inactive";
    result.lyDo = "Thiết bị ngừng sử dụng";
    return result;
  }
  const interval = String(device.soNgayCanBaoDuong || "");
  if (
    !/^\d+$/.test(interval) ||
    Number(interval) < 1 ||
    Number(interval) > 36500
  ) {
    result.lyDo = "Chưa có chu kỳ bảo dưỡng hợp lệ";
    return result;
  }
  const completed = history
    .filter(
      (h) =>
        h.loai === "maintenance" &&
        maintenanceCompleted_(h.hoanThanh) &&
        (h.maHoSo || maintenanceDeviceKey_(h)) === result.maHoSo,
    )
    .filter((h) => {
      try {
        maintenanceDate_(h.ngayThucHien);
        return h.ngayThucHien <= today;
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.ngayThucHien.localeCompare(a.ngayThucHien));
  const base = completed.length
    ? completed[0].ngayThucHien
    : String(device.ngayLapDat || "");
  try {
    maintenanceDate_(base);
  } catch {
    result.lyDo = "Chưa có ngày lắp đặt hoặc lần bảo dưỡng hoàn thành";
    return result;
  }
  result.ngayBaoDuongGanNhat = completed.length ? base : "";
  result.nguonLich = completed.length ? "lichSu" : "ngayLapDat";
  result.ngayDenHan = maintenanceAddDays_(base, Number(interval));
  result.soNgayConLai = Math.round(
    (maintenanceDate_(result.ngayDenHan) - maintenanceDate_(today)) / 86400000,
  );
  result.trangThai =
    result.soNgayConLai < 0
      ? "overdue"
      : result.soNgayConLai === 0
        ? "today"
        : result.soNgayConLai <= 14
          ? "upcoming"
          : "normal";
  return result;
}
