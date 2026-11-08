# Equipment management implementation plan
Spec: ../specs/2026-11-08-equipment-design.md
Execute inline with executing-plans. User approved Google Sheets/Apps Script only, private Drive photos, TaiKhoan login and desktop left menu.
- [x] Domain calendar, rolling14days and overdue rules.
- [x] Hierarchical assets, per-component schedules, repair/maintenance jobs, private multiple photos, reports and audit.
- [x] Native HtmlService and google.script.run; removed Firebase runtime/auth/FCM and IAM requirements.
- [x] TaiKhoan tenDangNhap/matKhau/chucVu/hoTen, case-insensitive names, hashed app passwords plus direct-sheet passwords, session expiry/logout/password-change revocation and throttle.
- [x] Verified 22 TaiKhoan/business/security cases and native Chrome login plus desktop/mobile UI; independent review findings fixed; Apps Script deployment updated.
- [ ] Owner runs setupEquipmentApp to grant Sheets/Drive/mail/trigger permissions; then verify live records/email/photos.
Do not claim live completion before owner consent. No sample machine data uploaded. Previous cloud resources left intact; old Hosting URL is only a link to Apps Script.

Schema đã chuyển sang 7 sheet tiếng Việt không dấu: DanhMucThietBi, LichBaoDuong, CongViec, TaiKhoan, NhatKyThongBao, NhatKyThaoTac, CauHinh. Đọc/ghi theo tên cột với alias cũ để tương thích; dữ liệu và ID không đổi. Chuyển đổi thật kiểm tra digest giữ nguyên toàn bộ các dòng.
