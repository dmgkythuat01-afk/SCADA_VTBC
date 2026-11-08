# DMG Mobile Quan ly thiet bi

Project riêng cho điện thoại, mở thẳng giao diện mobile với menu dưới.

Apps Script: https://script.google.com/d/1pslo6vQfhFAZlB_jVzjZQsrTgvdAMIZ4yS4emcVZW7eqqQziWhzBu3LQ/edit

App: https://script.google.com/macros/s/AKfycbzMajCHwyZ8ohRElBG5SKeE0jbG6orEIHXOUBh_bF611yGq8zLDgCZK-UrsBj8gPQQUhA/exec

Chủ project mở editor, chọn `capQuyenMobile` → Run → cấp quyền Google lần đầu cho project mới. Hàm chỉ đọc tên file Sheets và thư mục Drive, không sửa dữ liệu. Nếu link app hiện Truy cập bị từ chối trước khi cấp quyền, hoàn tất bước này bằng tài khoản sở hữu project.

Dùng chung file Sheets và các tài khoản mẫu trong TaiKhoan với app quản trị. Không tạo bản sao dữ liệu, thư mục ảnh hoặc trigger email. Các role TruongCa/CongNhan/PhongCongNghe tạo phiếu; KyThuat/CoKhi/TuDongHoa xem mọi phiếu và báo cáo; người tạo xác nhận hoặc yêu cầu làm lại. Người thực hiện được ghi theo tài khoản thực tế.

Project này chứa Code.js và ba file MobileIndex/MobileStyles/MobileClient. Backend nghiệp vụ được gọi qua thư viện EquipmentCore, ghim phiên bản 17 của project QuanLyThietBi. Script Properties, Cache và Lock tạo bên trong thư viện thuộc backend dùng chung, theo tài liệu Google: https://developers.google.com/apps-script/guides/libraries#resource_scoping . Vì vậy hai giao diện không dùng hai bộ khóa độc lập khi cùng sửa một phiếu. Khi nâng cấp backend, kiểm thử và tăng version thư viện trong manifest; không bật developmentMode trên production.

Triển khai từ thư mục này: `clasp push --force`, sau đó cập nhật deployment hiện có. Không chạy setupEquipmentApp hay tạo trigger email trong project mobile.
