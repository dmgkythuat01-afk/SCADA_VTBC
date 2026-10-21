/** DMG Account Portal - Google Apps Script */
const SPREADSHEET_ID = '1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ';
const ACCOUNT_SHEET = 'Account';
const SESSION_SECONDS = 21600; // 6 hours
const ACCOUNT_HEADERS = ['useName', 'passWord', 'role', 'department'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('DMG | Quản lý tài khoản')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function sheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'DIEN_SHEET_ID_VAO_DAY') throw new Error('Chưa cấu hình SPREADSHEET_ID.');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(ACCOUNT_SHEET);
  if (!sh) throw new Error('Không tìm thấy sheet Account.');
  return sh;
}
function accounts_() {
  const sh = sheet_();
  const vals = sh.getDataRange().getDisplayValues();
  if (!vals.length) throw new Error('Sheet Account chưa có tiêu đề.');
  const heads = vals[0].map(v => String(v).trim());
  const col = {};
  ACCOUNT_HEADERS.forEach(h => {
    col[h] = heads.indexOf(h);
    if (col[h] < 0) throw new Error('Sheet Account thiếu cột: ' + h);
  });
  const items = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const useName = String(r[col.useName] || '').trim();
    if (useName) items.push({row: i + 1, useName, passWord: String(r[col.passWord] || ''), role: String(r[col.role] || '').trim(), department: String(r[col.department] || '').trim()});
  }
  return {sh, col, items};
}
function key_(name) { return String(name || '').trim().toLowerCase(); }
function find_(items, name) { return items.find(a => key_(a.useName) === key_(name)); }
function publicUser_(a) { return {useName:a.useName,role:a.role,department:a.department}; }
function newToken_() { return Utilities.getUuid() + '-' + Utilities.getUuid(); }
function credentialVersion_(a) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a.useName + '\u0000' + a.passWord)); }
function sessionKey_(token) { return 'dmg_account_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0,60); }
function requireUser_(token) {
  if (!token || typeof token !== 'string') throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
  const cached = CacheService.getScriptCache().get(sessionKey_(token));
  if (!cached) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const obj = JSON.parse(cached);
  const a = find_(accounts_().items, obj.useName);
  if (!a || obj.credentialVersion !== credentialVersion_(a)) throw new Error('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.');
  return a;
}
function requireDev_(token) {
  const a = requireUser_(token);
  if (a.role !== 'adminDEV') throw new Error('Bạn không có quyền quản trị tài khoản.');
  return a;
}
function validatePassword_(pw) {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 128) throw new Error('Mật khẩu phải từ 8 đến 128 ký tự.');
  if (!pw.trim()) throw new Error('Mật khẩu không được để trống.');
}
function login(useName, passWord) {
  const a = find_(accounts_().items, useName);
  if (!a || String(a.passWord) !== String(passWord || '')) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
  const token = newToken_();
  CacheService.getScriptCache().put(sessionKey_(token), JSON.stringify({useName:a.useName,credentialVersion:credentialVersion_(a)}), SESSION_SECONDS);
  return {token, user:publicUser_(a), expiresIn:SESSION_SECONDS};
}
function getMyProfile(token) { return publicUser_(requireUser_(token)); }
function logout(token) {
  if (typeof token === 'string' && token) CacheService.getScriptCache().remove(sessionKey_(token));
  return {success:true};
}
function changeMyPassword(token, oldPassword, newPassword) {
  validatePassword_(newPassword);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const me = requireUser_(token);
    if (me.passWord !== String(oldPassword || '')) throw new Error('Mật khẩu hiện tại không đúng.');
    if (newPassword === oldPassword) throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
    const d = accounts_();
    const current = find_(d.items, me.useName);
    d.sh.getRange(current.row, d.col.passWord + 1).setNumberFormat('@').setValue(newPassword);
    CacheService.getScriptCache().remove(sessionKey_(token));
    return {success:true, message:'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'};
  } finally { lock.releaseLock(); }
}
function getAccountManagementData(token) {
  requireDev_(token);
  const d = accounts_();
  const roles = [...new Set(d.items.map(a => a.role).filter(Boolean))].sort();
  const departments = [...new Set(d.items.map(a => a.department).filter(Boolean))].sort();
  return {accounts:d.items.map(publicUser_), roles, departments};
}
function saveAccount(token, input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const me = requireDev_(token);
    input = input || {};
    const original = String(input.originalUseName || '').trim();
    const useName = String(input.useName || '').trim();
    const role = String(input.role || '').trim();
    const department = String(input.department || '').trim();
    const passWord = input.passWord === undefined || input.passWord === null ? '' : String(input.passWord);
    if (!useName || useName.length > 100 || /[\r\n]/.test(useName)) throw new Error('Tên đăng nhập không hợp lệ.');
    if (!role) throw new Error('Vui lòng chọn quyền.');
    if (department.length > 150) throw new Error('Tên phòng ban quá dài.');
    const d = accounts_();
    const existing = original ? find_(d.items, original) : null;
    if (original && !existing) throw new Error('Tài khoản cần sửa không còn tồn tại.');
    const dup = find_(d.items, useName);
    if (dup && (!existing || dup.row !== existing.row)) throw new Error('Tên đăng nhập đã tồn tại.');
    const roles = [...new Set(d.items.map(a => a.role).filter(Boolean))];
    if (!roles.includes(role)) throw new Error('Role không có trong danh sách hiện tại.');
    if (existing && key_(existing.useName) === key_(me.useName) && (role !== 'adminDEV' || key_(useName) !== key_(existing.useName))) throw new Error('Không được đổi tên hoặc hạ quyền adminDEV của chính mình.');
    if (!existing || passWord) validatePassword_(passWord);
    if (existing) {
      d.sh.getRange(existing.row, d.col.useName + 1).setValue(useName);
      if (passWord) d.sh.getRange(existing.row, d.col.passWord + 1).setNumberFormat('@').setValue(passWord);
      d.sh.getRange(existing.row, d.col.role + 1).setValue(role);
      d.sh.getRange(existing.row, d.col.department + 1).setValue(department);
    } else {
      const row = d.sh.getLastRow() + 1;
      d.sh.getRange(row, d.col.useName + 1).setValue(useName);
      d.sh.getRange(row, d.col.passWord + 1).setNumberFormat('@').setValue(passWord);
      d.sh.getRange(row, d.col.role + 1).setValue(role);
      d.sh.getRange(row, d.col.department + 1).setValue(department);
    }
    return {success:true, message: existing ? 'Cập nhật tài khoản thành công.' : 'Thêm tài khoản thành công.'};
  } finally { lock.releaseLock(); }
}
function deleteAccount(token, useName) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const me = requireDev_(token);
    if (key_(me.useName) === key_(useName)) throw new Error('Không được xóa tài khoản đang đăng nhập.');
    const d = accounts_();
    const a = find_(d.items, useName);
    if (!a) throw new Error('Không tìm thấy tài khoản.');
    if (a.role === 'adminDEV' && d.items.filter(x => x.role === 'adminDEV').length <= 1) throw new Error('Không được xóa adminDEV cuối cùng.');
    d.sh.deleteRow(a.row);
    return {success:true, message:'Đã xóa tài khoản ' + a.useName + '.'};
  } finally { lock.releaseLock(); }
}
