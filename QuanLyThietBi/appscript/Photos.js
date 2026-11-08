function uploadPhoto_(u, p) {
  const requestId = required_(p.requestId, "mã yêu cầu", 100),
    j = job_(p.jobId);
  canWork_(u, j);
  if (j.status === "completed") throw Error("Công việc đã hoàn thành.");
  const photos = parsed_(j.photos, []);
  const existing = photos.find((a) => a.requestId === requestId);
  if (existing) return existing;
  if (photos.length >= 12) throw Error("Mỗi công việc tối đa 12 ảnh.");
  const data = p.dataUrl;
  if (
    typeof data !== "string" ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data) ||
    data.length > 4200000
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
  const folder = props_().getProperty("PHOTO_FOLDER");
  if (!folder)
    throw Error("Chưa khởi tạo thư mục ảnh. Chạy setupEquipmentApp.");
  const file = DriveApp.getFolderById(folder).createFile(
    Utilities.newBlob(bytes, "image/jpeg", j.id + "_" + id_() + ".jpg"),
  );
  const attachment = {
    id: file.getId(),
    name: text_(p.name, 150) || "Ảnh công việc",
    at: now_(),
    by: u.email,
    requestId: required_(p.requestId, "mã yêu cầu", 100),
  };
  photos.push(attachment);
  j.photos = JSON.stringify(photos);
  j.revision = Number(j.revision) + 1;
  write_("Jobs", j);
  audit_(u, "uploadPhoto", j.id);
  return attachment;
}
function readPhoto_(u, p) {
  const j = job_(p.jobId),
    attachment = parsed_(j.photos, []).find((a) => a.id === p.id);
  if (!attachment) throw Error("Không tìm thấy ảnh trong công việc.");
  const file = DriveApp.getFileById(attachment.id);
  if (file.getMimeType() !== "image/jpeg" || file.getSize() > 3 * 1024 * 1024)
    throw Error("Ảnh không hợp lệ.");
  return {
    dataUrl:
      "data:image/jpeg;base64," +
      Utilities.base64Encode(file.getBlob().getBytes()),
  };
}
