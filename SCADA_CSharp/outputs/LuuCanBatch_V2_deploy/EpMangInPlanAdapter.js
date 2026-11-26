/* Small dependency adapter for the shared stock API. Credentials stay in its
 * existing Code file; this module contains none. */
const SHEET_KE_HOACH_EP_MANG_IN = 'KeHoachEpMangIn';
function getSpreadsheet_(){return SpreadsheetApp.openById(SPREADSHEET_ID);}
function getKeHoachEpMangInHeaders_(){return ['STT','maSanPham','tenSanPham','soLuongViKeHoach','thoiGianTao','nguoiTao','trangThai','soLuongViThucHien','ghiChu','nguoiBaoCao','ThoiGianBaoCao'];}
function formatDateTimeValue_(v){return Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss'):String(v??'');}
function isWithinLastFiveDays_(v){
  const today=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd'),start=new Date(today+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-4);
  const text=Object.prototype.toString.call(v)==='[object Date]'?Utilities.formatDate(v,'Asia/Ho_Chi_Minh','yyyy-MM-dd'):String(v||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text)&&text>=start.toISOString().slice(0,10)&&text<=today;
}
function getSimplePlanProductByMa_(ma){const rows=epBoxRead_('DanhSachSanPhamVTBC',['maSanPham','tenSanPham']).rows.filter(r=>epBoxText_(r.maSanPham)===ma);if(rows.length!==1)throw Error('Không tìm thấy đúng một sản phẩm '+ma);return rows[0];}
