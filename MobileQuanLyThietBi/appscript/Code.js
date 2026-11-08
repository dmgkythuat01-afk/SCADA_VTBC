// Independent mobile app; shared versioned backend owns Sheets, sessions and locks.
function equipmentBaseUrl_() {
  return 'https://script.google.com/macros/s/AKfycbxySBhZ2vOCKpWAgPOj8IlsIRCnH0HjkPxbzPr6pF5VsHuyL_RTDmJQfh4dKjCeVfRvKg/exec';
}
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('MobileIndex');
  const requested = String((e && e.parameter && e.parameter.requestId) || '');
  template.initialRequestId = /^[A-Za-z0-9_-]{1,100}$/.test(requested) ? requested : '';
  return template.evaluate().setTitle('DMG Mobile — Yêu cầu bảo trì')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}
function loginEquipment(username, password) {
  return EquipmentCore.loginEquipment(username, password);
}
function logoutEquipment(token) {
  return EquipmentCore.logoutEquipment(token);
}
function mobileApi(token, action, payload) {
  const result = EquipmentCore.mobileApi(token, action, payload);
  if (action === 'snapshot') result.desktopUrl = equipmentBaseUrl_();
  return result;
}
// Run once from the editor as the project owner to grant the new app access.
function capQuyenMobile() {
  SpreadsheetApp.openById('1GyLKh_9gwPeAzTMuowR3OE8eYnSSnoMPMLnWcUYxpoI').getName();
  DriveApp.getRootFolder().getName();
  return {success: true, message: 'Đã cấp quyền đọc/ghi dữ liệu cho app mobile.'};
}
