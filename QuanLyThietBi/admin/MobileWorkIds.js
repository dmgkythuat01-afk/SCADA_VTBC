function mobileWorkIdMillis_() {
  return Date.now();
}
// Call within the existing shared ScriptLock. Persist the last reserved
// millisecond so simultaneous documents/retries never reuse a business ID.
// Authentication tokens and client idempotency keys continue using random UUIDs.
function mobileWorkDocumentId_(prefix) {
  if (!/^[A-Z]{2,6}$/.test(prefix || "")) throw Error("Tiền tố mã chứng từ không hợp lệ.");
  const properties=PropertiesService.getScriptProperties();
  const prior=Number(properties.getProperty("MOBILE_DOCUMENT_LAST_MS"));
  const clock=Number(mobileWorkIdMillis_());
  if (!Number.isFinite(clock) || clock<=0) throw Error("Không xác định được thời gian tạo mã.");
  const ms=Math.max(Math.trunc(clock),Number.isFinite(prior)?prior+1:0);
  const stamp=Utilities.formatDate(new Date(ms),"Asia/Ho_Chi_Minh","ddMMyyyyHHmmssSSS");
  properties.setProperty("MOBILE_DOCUMENT_LAST_MS",String(ms));
  return prefix+stamp;
}
