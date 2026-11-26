# SCADA C# WinForms

Mốc sao lưu mã nguồn ngày 26/11/2026, sau khi sửa lỗi trùng `InitializeComponent()`
và thêm chọn kế hoạch ép màng in, kiểm tra thùng đã xuất trước khi lưu.

## Mở dự án

- Mở `CanScadaVienTreoBC.sln` bằng Visual Studio, cài .NET Framework 4.6.1 targeting pack.
- Restore NuGet packages theo `CanScadaVienTreoBC/packages.config`.
- Cài Mitsubishi MX Component để cung cấp COM `ActUtlTypeLib` cho chức năng PLC.
- Chỉnh giao diện bằng Designer của `FrmScadaMain.cs`. File
  `FrmScadaMain.EpMangInPlans.cs` là mã partial, không mở như một form riêng.

## Cấu hình khi phục hồi từ Git

Bản Git không chứa token API thật, khóa ký `.pfx`, file `.user`, `bin`, `obj`
hoặc package đã tải. Trong `GoogleSheetApiService.cs`, thay
`CONFIGURE_READ_TOKEN` và `CONFIGURE_WRITE_TOKEN` bằng cấu hình riêng của máy.
Không commit các giá trị thật lên GitHub.

Kết nối SQL Server hiện tại nằm trong ba service `SqlDataService`,
`SqlSyncService`, `ChiTietCanBatchService`; chỉnh theo máy được cài đặt.
Dự án chưa chuyển sang MySQL.

Nếu build yêu cầu khóa ClickOnce, dùng khóa gốc được lưu riêng trên máy hoặc
build kiểm tra với `/p:SignManifests=false`. Không đưa khóa ký lên GitHub.

## Apps Script đi kèm

`outputs/LuuCanBatch_V2_deploy` chứa bản nhiều file tương ứng API ghi dữ liệu.
Giữ nguyên các module riêng; không gộp tất cả vào `Code.js` nếu các module vẫn
còn trong Apps Script, để tránh khai báo trùng. `CONFIGURE_API_TOKEN` là chỗ
điền token riêng trước khi triển khai; phải khớp token ghi của C#.
File `.clasp.json` không được đưa vào Git: cần trỏ đúng dự án trước khi push.
Không chạy triển khai chỉ để phục hồi mã C#.

## Bản sao local nguyên gốc

Máy làm việc giữ bản sao mã nguồn và cấu hình riêng tại:
`backups/SCADA_CSharp_20261126_094818` trong thư mục solution gốc.
Bản này có token và khóa ký gốc, chỉ lưu local. `SHA256.json` ghi mã kiểm tra
tính toàn vẹn của từng file. Giữ thư mục này riêng tư.

Đã kiểm tra biên dịch toàn bộ C# và các kiểm thử logic kế hoạch ép màng in.
Chưa kiểm tra build bộ cài hoặc toàn bộ chức năng trên thiết bị thật tại mốc này.
