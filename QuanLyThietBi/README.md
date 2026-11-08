# DMG Quản lý thiết bị — Google Sheets + Apps Script

App: https://script.google.com/macros/s/AKfycbwK1JwWhrazLtOZ7YnPZedvkS71KLvCWCQDY52fvmLVk4505FulJFF_ER7Cz1mkaYguJg/exec
Sheet: https://docs.google.com/spreadsheets/d/1GyLKh_9gwPeAzTMuowR3OE8eYnSSnoMPMLnWcUYxpoI/edit
Apps Script: https://script.google.com/d/1n2ecVQFAiRDNFKI6t3gXWxNBqCwtjlOWoploVOcluxowBSxSe_GY_o9T/edit

## Khởi tạo một lần
Mở Apps Script, chọn `setupEquipmentApp`, Run và cấp quyền Sheets, Drive, email và trigger.
Hàm tạo các sheet, thư mục Drive riêng tư, lịch báo cáo thứ Hai/thứ Sáu 8–9h Việt Nam và tài khoản admin nếu chưa có.
Tài khoản ban đầu: `admin`. Mật khẩu ngẫu nhiên hiện trong Execution log lần khởi tạo đầu; không ghi mật khẩu vào source.
Có thể dùng tài khoản bạn tự điền trong sheet TaiKhoan. Quên mật khẩu admin: chủ project chạy `resetEquipmentAdminPassword` trong editor.
Không cần Firebase, Web Push key hoặc cấp IAM. App dùng link Apps Script trực tiếp; link Hosting cũ chỉ dẫn đến app mới. Các tài nguyên cloud đã tạo trước đó không bị xóa.

## Dữ liệu mẫu
File đã có bộ mẫu: 2 tài khoản (`demo.admin`, `demo.kt`), 2 xưởng, 3 khu vực, 3 máy, 6 bộ phận, 6 lịch bảo dưỡng và 4 công việc. Mật khẩu mẫu nằm trong cột `matKhau` của TaiKhoan; không ghi vào source Git.
Các danh mục/công việc minh họa có nhãn `[MẪU]` và ID bắt đầu `DEMO_`. Nhật ký `demo` chỉ là minh họa, không phải email đã gửi. Không dùng ảnh giả cho công việc mẫu.
Chủ project có thể chạy `taoDuLieuMauThietBi` trong Apps Script để bổ sung lại những dòng mẫu còn thiếu. Hàm không ghi đè dòng đã có, không đổi mật khẩu tài khoản đã tồn tại và không gửi email. Tab DanhMucThietBi và TaiKhoan được đưa lên đầu để dễ xem.

## Sheet TaiKhoan
Đúng bốn cột theo thứ tự: `tenDangNhap`, `matKhau`, `chucVu`, `hoTen`.
- useName: tên đăng nhập; không phân biệt chữ hoa/thường, bỏ khoảng trắng đầu/cuối. Không được trùng.
- passWord: mật khẩu; phân biệt hoa/thường. Hỗ trợ mật khẩu bạn điền trực tiếp trong sheet. Mật khẩu tạo từ app được lưu dưới dạng băm trong chính cột này.
- role: chức vụ; `admin` (hoặc Quản trị/Quản trị viên) có quyền quản trị. Chức vụ khác dùng quyền kỹ thuật; `disabled` khóa tài khoản.
- name: họ tên hiển thị trên giao diện và lịch sử.
Không trả mật khẩu về trình duyệt. Phiên tối đa6h, đổi mật khẩu/khóa tài khoản sẽ vô hiệu phiên cũ. Thử sai5lần sẽ chờ15phút.
Thêm/sửa tài khoản trong Cài đặt hoặc chỉnh TaiKhoan trực tiếp. Email nhận báo cáo cấu hình riêng trong Cài đặt, không bắt buộc tên đăng nhập phải là email.

## Tính năng
Giao diện desktop với menu trái và bố cục thích ứng điện thoại. Xưởng → khu vực → máy → bộ phận. Hồ sơ công dụng, thông số, checklist thêm/bớt. Mỗi bộ phận nhiều công việc bảo dưỡng theo tuần/tháng.
Đến hạn hoặc quá hạn giữ đỏ đến khi hoàn thành. Hạn mới = ngày thực tế hoàn thành + chu kỳ; ngày cuối tháng được giới hạn theo tháng kế tiếp.
Sửa chữa/bảo dưỡng có người nhận, checklist, kết quả và nhiều ảnh. Mỗi việc tối đa12ảnh JPEG, tối đa3MB/ảnh sau thu nhỏ. Ảnh lưu riêng tư trên Drive, không chia sẻ công khai.
Lịch sử giữ lại khi ngừng sử dụng bộ phận. Email thứ Hai/thứ Sáu gồm việc quá hạn, 14ngày tới, việc chưa xong và hoàn thành7ngày gần nhất. Không dùng thông báo Windows.

## File và dữ liệu
appscript/Index.html: khung trang/login/menu trái. Styles.html: giao diện. Client.html: thao tác trình duyệt qua google.script.run.
Auth.js: đăng nhập TaiKhoan/phiên/quyền/khởi tạo. Store.js: schema và đọc ghi Sheets. Domain.js: tính lịch. Equipment.js: hồ sơ/lịch/công việc. Photos.js: Drive. Reports.js: email.
Các sheet: DanhMucThietBi, LichBaoDuong, CongViec, TaiKhoan, NhatKyThongBao, NhatKyThaoTac, CauHinh. Mọi liên kết dùng ID bền vững; không xóa lịch sử. Cột CongViec.maYeuCau và maYeuCauHoanThanh tách riêng để chống yêu cầu gửi lặp.
Không tự sửa tên cột nghiệp vụ. Riêng TaiKhoan cho phép cập nhật mật khẩu/tài khoản trực tiếp.

## Kiểm thử và triển khai
Từ repo root: `node --test tests/quan-ly-thiet-bi/*.test.cjs`.
Từ QuanLyThietBi: `clasp push --force`.
Cập nhật deployment: `clasp deploy -i AKfycbwK1JwWhrazLtOZ7YnPZedvkS71KLvCWCQDY52fvmLVk4505FulJFF_ER7Cz1mkaYguJg --description "Equipment update"`.
Google vẫn cần chủ project cấp quyền một lần. Gửi email thật/ghi ảnh thật chỉ được xác nhận sau bước khởi tạo; kiểm thử tự động không ghi dữ liệu mẫu vào Sheets.

## Tên sheet và cột tiếng Việt không dấu
- DanhMucThietBi: maDinhDanh, loaiDanhMuc, maCapTren, tenDanhMuc, maThietBi, congDung, chiTiet, danhSachKiemTra, dangSuDung, thoiGianCapNhat, nguoiCapNhat, phienBan.
- LichBaoDuong: maLich, maBoPhan, tenCongViec, chuKy, donViChuKy, ngayDenHan, nguoiPhuTrach, danhSachKiemTra, dangApDung, thoiGianCapNhat, phienBan.
- CongViec: maCongViec, maBoPhan, maLich, loaiCongViec, tieuDe, moTa, nguoiPhuTrach, trangThai, thoiGianTao, nguoiTao, ngayHoanThanh, thoiGianHoanThanh, nguoiHoanThanh, ketQua, danhSachAnh, maYeuCau, phienBan, maYeuCauHoanThanh.
- TaiKhoan: tenDangNhap, matKhau, chucVu, hoTen.
- NhatKyThongBao: maThongBao, ngay, kenh, nguoiNhan, trangThai, noiDung, thoiGianGui.
- NhatKyThaoTac: maThaoTac, thoiGian, nguoiThaoTac, hanhDong, doiTuong, chiTiet.
- CauHinh: tenCauHinh, giaTri.
Code ánh xạ theo tiêu đề cột, hỗ trợ tên cũ trong thời gian chuyển đổi. Tên thuộc tính JavaScript nội bộ không phải tên cột vật lý. Hàm chủ project `doiTenSheetVaCotTiengViet` kiểm tra trước khi đổi, sao lưu metadata tên cũ và đối chiếu digest các dòng dữ liệu; không đổi nội dung, ID hay mật khẩu. Chuyển đổi đã thực hiện trên file hiện tại.
