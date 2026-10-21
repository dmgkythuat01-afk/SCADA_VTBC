/**
 * GOOGLE SHEET -> SQL SERVER DELTA SYNC V3
 *
 * V3:
 * - Không dùng keyFields và không tạo _syncKey.
 * - Sheet append chỉ đọc các dòng mới theo cursor.
 * - Sheet snapshot dùng snapshotVersion để không đọc lại dữ liệu khi không đổi.
 */
const SYNC_API_VERSION = "V3";
const SPREADSHEET_ID = "1yFlCpC6JzLRmv9hukNw05vYpeYmkhXRcPC-0nCNOjAQ";
const API_TOKEN = "Manhlv286@123ra";
const DEFAULT_MAX_ROWS_PER_SHEET = 5000;
const HARD_MAX_ROWS_PER_SHEET = 20000;
const SNAPSHOT_VERSION_PREFIX = "SNAPSHOT_VERSION_";

/**
 * mode = append:
 * - Chỉ đọc các dòng sau cursor.
 * - Chỉ dùng cho sheet luôn thêm dòng ở cuối.
 * - Không xóa/chèn/sort vật lý các dòng cũ.
 *
 * mode = snapshot:
 * - Có thể sửa hoặc xóa dữ liệu cũ.
 * - Chỉ đọc toàn bộ khi snapshotVersion thay đổi.
 *
 * excludeFields:
 * - Các cột không trả về C#.
 */
const SQL_SYNC_SHEETS = {
  Account: { mode: "snapshot", excludeFields: ["passWord"] },
  DanhMuc: { mode: "snapshot" },
  TonKhoDau: { mode: "snapshot" },
  ChiTietSanXuatBanThanhPham: { mode: "append" },
  KeHoachLapViVTBC: { mode: "snapshot" },
  ChiTietBTPtheoThung: { mode: "snapshot" },
  chiTietLapVi: { mode: "append" },
  LichSuLapVi: { mode: "append" },
  NhapLaiKhoVienVTBC: { mode: "append" },
  VienVTBCHong: { mode: "append" },
  KetQuaLapVi: { mode: "append" },
  EpMangIn: { mode: "append" },
  DongThung: { mode: "append" },
  KeHoachEpMangIn: { mode: "snapshot" },
  KeHoachDongThung: { mode: "snapshot" },
  NhapLaiKhoSauCan: { mode: "append" },
  chiTietTronLieuSanXuat: { mode: "append" },
  ThemNguyenLieuTaiChe: { mode: "append" },
  ChiTietCanBatch: { mode: "append" },
  PhieuXuatNguyenLieu: { mode: "snapshot" },
  BaiTronLieu: { mode: "snapshot" },
  DanhSachSanPhamVTBC: { mode: "snapshot" },
  NhomBaiTron: { mode: "snapshot" },
  NguyenLieu: { mode: "snapshot" },
  KhoNguyenLieu: { mode: "snapshot" },
  DinhLuong: { mode: "snapshot" },
  SanPham: { mode: "snapshot" },
  DonHangNhapKho: { mode: "snapshot" },
  KeHoachSanXuat: { mode: "snapshot" },
  PhieuXuatThuCong: { mode: "append" }
};
