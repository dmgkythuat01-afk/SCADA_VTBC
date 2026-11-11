function mobileWorkUploadReportPhoto_(u, p) {
  const key = mobileWorkRequired_(p.uploadKey, "mã tải ảnh", 100),
    { d, r } = mobileWorkEditableReport_(u, p),
    photos = mobileWorkParse_(d.photos, []),
    existing = photos.find((a) => a.uploadKey === key);
  if (mobileWorkV2_(r) && mobileWorkV2Stage_(d) !== "handover") throw Error("Ảnh chỉ được thêm ở bước bàn giao sau hai PGĐ phê duyệt.");
  if (existing) return { report: d, attachment: existing };
  mobileWorkCheckRevision_(d, p);
  if (photos.length >= 12) throw Error("Tối đa 12 ảnh mỗi lần báo cáo.");
  const data = p.dataUrl;
  if (
    typeof data !== "string" ||
    data.length > 4200000 ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)
  )
    throw Error("Ảnh phải là JPEG, tối đa 3 MB.");
  const bytes = Utilities.base64Decode(data.split(",")[1]);
  if (
    bytes.length > 3 * 1024 * 1024 ||
    bytes.length < 4 ||
    (bytes[0] & 255) !== 255 ||
    (bytes[1] & 255) !== 216 ||
    (bytes[bytes.length - 2] & 255) !== 255 ||
    (bytes[bytes.length - 1] & 255) !== 217
  )
    throw Error("Ảnh JPEG không hợp lệ.");
  const folder = PropertiesService.getScriptProperties().getProperty(
    "BAODUONG_PHOTO_FOLDER",
  );
  if (!folder) throw Error("Chưa khởi tạo thư mục ảnh.");
  const file = DriveApp.getFolderById(folder).createFile(
      Utilities.newBlob(
        bytes,
        "image/jpeg",
        "REPORT_" + d.id + "_" + mobileWorkId_() + ".jpg",
      ),
    ),
    attachment = {
      id: file.getId(),
      name: mobileWorkText_(p.name, 150) || "Ảnh khắc phục",
      at: mobileWorkNow_(),
      by: u.email,
      uploadKey: key,
    };
  photos.push(attachment);
  d.photos = JSON.stringify(photos);
  d.revision = Number(d.revision) + 1;
  mobileWorkWrite_("ServiceReports", d);

  return { report: d, attachment };
}
function mobileWorkReadReportPhoto_(u, p) {
  const d = mobileWorkReport_(p.reportId),
    r = mobileWorkRequest_(d.requestId),
    caps = mobileWorkRequireAccess_(u);
  if (
    !mobileWorkCanView_(u, r) ||
    (mobileWorkDraft_(d) && d.createdBy !== u.email && !caps.admin)
  )
    throw Error("Bạn không được xem ảnh của báo cáo này.");
  const attachment = mobileWorkParse_(d.photos, []).find((a) => a.id === p.id);
  if (!attachment) throw Error("Ảnh không thuộc báo cáo.");
  const file = DriveApp.getFileById(attachment.id);
  if (file.getMimeType() !== "image/jpeg" || file.getSize() > 3 * 1024 * 1024)
    throw Error("Ảnh không hợp lệ.");
  return {
    dataUrl:
      "data:image/jpeg;base64," +
      Utilities.base64Encode(file.getBlob().getBytes()),
  };
}
