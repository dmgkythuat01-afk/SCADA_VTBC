# DMG Mobile Quan ly thiet bi

Project riêng cho điện thoại, mở thẳng giao diện mobile với menu dưới.

Apps Script: https://script.google.com/d/1pslo6vQfhFAZlB_jVzjZQsrTgvdAMIZ4yS4emcVZW7eqqQziWhzBu3LQ/edit

App: https://script.google.com/macros/s/AKfycbzMajCHwyZ8ohRElBG5SKeE0jbG6orEIHXOUBh_bF611yGq8zLDgCZK-UrsBj8gPQQUhA/exec

Chủ project mở editor, chọn `capQuyenMobile` → Run → cấp quyền Google lần đầu cho project mới. Hàm chỉ đọc tên file Sheets và thư mục Drive, không sửa dữ liệu. Nếu link app hiện Truy cập bị từ chối trước khi cấp quyền, hoàn tất bước này bằng tài khoản sở hữu project.

Dùng chung file Sheets và tài khoản hiện có trong `TaiKhoan` với app quản trị. Không tự tạo tài khoản mẫu, bản sao danh mục hoặc trigger email. Các role TruongCa/CongNhan/PhongCongNghe tạo phiếu; KyThuat/CoKhi/TuDongHoa xem mọi phiếu và báo cáo; người tạo xác nhận hoặc yêu cầu làm lại. Người thực hiện được ghi theo tài khoản thực tế.

Project này chứa Code.js và ba file MobileIndex/MobileStyles/MobileClient. Backend nghiệp vụ nằm trong các file `MobileWork*.js` của `QuanLyThietBi/admin/`, gọi qua thư viện EquipmentCore và ghim phiên bản 41 trong manifest. Script Properties, Cache và Lock tạo bên trong thư viện thuộc backend dùng chung, theo tài liệu Google: https://developers.google.com/apps-script/guides/libraries#resource_scoping . Hai giao diện dùng cùng khóa cập nhật. Khi nâng cấp backend, kiểm thử và tăng version thư viện trong manifest; không bật developmentMode trên production.

## Danh mục mới — 09/11/2026

Đọc trực tiếp `TaiKhoan`, `DanhMucXuong`, `DanhMucMay`, `DanhMucThietBi`, `DanhMucCanKiemTra` hiện có. Luồng chọn là xưởng → máy → thiết bị; có thể để trống thiết bị để yêu cầu cho toàn máy. Thiết bị hiển thị tên và mã, đúng xưởng/máy cha. Không sử dụng bảng khu vực, máy hay lịch bảo dưỡng của backend cũ.

Các bảng phiếu riêng: `PhieuYeuCau`, `BaoCaoKhacPhuc`, `XacNhanKhacPhuc`, `ThongBaoMobile`. Chủ project có thể chạy `khoiTaoMobileTheoDanhMuc` trong backend admin để tạo bảng/cột còn thiếu; hàm đối chiếu dữ liệu các sheet khác trước/sau, không tạo ví dụ hay gửi email. Mã phiếu/trạng thái/kết quả được lưu theo tên cột, không phụ thuộc thứ tự vật lý.

Báo cáo bảo dưỡng thiết bị lấy chỉ tiêu và tiêu chuẩn hiện tại từ `DanhMucCanKiemTra`; nhập kết quả thực tế, đánh dấu Đạt từng mục. Nếu tiêu chuẩn thay đổi lúc đang soạn, mở lại báo cáo để lấy bộ mới. Ảnh tối đa 12 ảnh/báo cáo, riêng tư trên Drive; hỗ trợ thư viện ảnh và camera gốc điện thoại.

Chỉ người tạo phiếu được xác nhận. Khi đồng ý, hệ thống ghi đúng một dòng vào `LichSuBaoDuong` hoặc `LichSuSuaChua` của admin, gồm người thực tế thực hiện, kết quả kiểm tra và ảnh. Lịch bảo dưỡng tính từ ngày thực tế hoàn thành đã được chấp nhận; yêu cầu toàn máy không thay đổi lịch riêng của từng thiết bị. Từ chối giữ lịch sử báo cáo và yêu cầu kỹ thuật làm lại. Các bước gửi/xác nhận có chống gửi trùng và phục hồi đồng bộ nếu ghi bị gián đoạn.

Triển khai từ thư mục này: `clasp push --force`, sau đó cập nhật deployment hiện có. Không chạy setupEquipmentApp hay tạo trigger email trong project mobile.
