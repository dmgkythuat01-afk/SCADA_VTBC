# DMG Mobile Quan ly thiet bi

Project riêng cho điện thoại, mở thẳng giao diện mobile với menu dưới.

Apps Script: https://script.google.com/d/1pslo6vQfhFAZlB_jVzjZQsrTgvdAMIZ4yS4emcVZW7eqqQziWhzBu3LQ/edit

App: https://script.google.com/macros/s/AKfycbzMajCHwyZ8ohRElBG5SKeE0jbG6orEIHXOUBh_bF611yGq8zLDgCZK-UrsBj8gPQQUhA/exec

Chủ project mở editor, chọn `capQuyenMobile` → Run → cấp quyền Google lần đầu cho project mới. Hàm chỉ đọc tên file Sheets và thư mục Drive, không sửa dữ liệu. Nếu link app hiện Truy cập bị từ chối trước khi cấp quyền, hoàn tất bước này bằng tài khoản sở hữu project.

Dùng chung file Sheets và tài khoản hiện có trong `TaiKhoan` với app quản trị. Không tự tạo tài khoản mẫu, bản sao danh mục hoặc trigger email. Các role TruongCa/CongNhan/PhongCongNghe tạo phiếu; KyThuat/CoKhi/TuDongHoa xem mọi phiếu và báo cáo; trưởng ca xác nhận rồi hai PGĐ duyệt song song. Người thực hiện được ghi theo tài khoản thực tế.

Project này chứa Code.js và ba file MobileIndex/MobileStyles/MobileClient. Backend nghiệp vụ nằm trong các file `MobileWork*.js` của `QuanLyThietBi/admin/`, gọi qua thư viện EquipmentCore và ghim phiên bản 49 trong manifest. Script Properties, Cache và Lock tạo bên trong thư viện thuộc backend dùng chung, theo tài liệu Google: https://developers.google.com/apps-script/guides/libraries#resource_scoping . Hai giao diện dùng cùng khóa cập nhật. Khi nâng cấp backend, kiểm thử và tăng version thư viện trong manifest; không bật developmentMode trên production.

## Danh mục mới — 09/11/2026

Đọc trực tiếp `TaiKhoan`, `DanhMucXuong`, `DanhMucMay`, `DanhMucThietBi`, `DanhMucCanKiemTra` hiện có. Luồng chọn là xưởng → máy → thiết bị; có thể để trống thiết bị để yêu cầu cho toàn máy. Thiết bị hiển thị tên và mã, đúng xưởng/máy cha. Không sử dụng bảng khu vực, máy hay lịch bảo dưỡng của backend cũ.

Các bảng phiếu riêng: `PhieuYeuCau`, `BaoCaoKhacPhuc`, `XacNhanKhacPhuc`, `ThongBaoMobile`. Chủ project có thể chạy `khoiTaoMobileTheoDanhMuc` trong backend admin để tạo bảng/cột còn thiếu; hàm đối chiếu dữ liệu các sheet khác trước/sau, không tạo ví dụ hay gửi email. Mã phiếu/trạng thái/kết quả được lưu theo tên cột, không phụ thuộc thứ tự vật lý.

Báo cáo bảo dưỡng thiết bị lấy chỉ tiêu và tiêu chuẩn hiện tại từ `DanhMucCanKiemTra`; nhập kết quả thực tế, đánh dấu Đạt từng mục. Nếu tiêu chuẩn thay đổi lúc đang soạn, mở lại báo cáo để lấy bộ mới. Ảnh tối đa 12 ảnh/báo cáo, riêng tư trên Drive; hỗ trợ thư viện ảnh và camera gốc điện thoại.

Kết quả do tài khoản `TruongCa` xác nhận; mọi trưởng ca đều được xác nhận phiếu. Sau khi đồng ý, hai nhánh `PGDChatLuong` và `PGDSanXuat` nhận phiếu chờ duyệt đồng thời. Mỗi người chỉ ký nhánh của mình, không cần chờ nhánh kia. `PGDCongNghe` được xem và theo dõi, không ký thay hai nhánh. Hai cột trên `PhieuYeuCau` là `trangThaiPGDChatLuong`, `trangThaiPGDSanXuat`.

Chỉ khi cả hai PGĐ đồng ý, hệ thống mới ghi đúng một dòng vào `LichSuBaoDuong` hoặc `LichSuSuaChua` của admin, gồm người thực tế thực hiện, kết quả kiểm tra và ảnh. Lịch bảo dưỡng tính từ ngày thực tế hoàn thành đã được chấp nhận đủ các cấp; yêu cầu toàn máy không thay đổi lịch riêng của từng thiết bị. Một PGĐ từ chối sẽ chuyển về kỹ thuật làm lại; sau báo cáo mới và trưởng ca xác nhận lại, cả hai PGĐ duyệt lại từ đầu. Các chữ ký, người ký, thời gian và ý kiến giữ trong `XacNhanKhacPhuc`. Các bước gửi/xác nhận có chống gửi trùng và phục hồi đồng bộ nếu ghi bị gián đoạn. Phiếu đã hoàn thành theo luồng cũ được giữ nguyên.

Triển khai từ thư mục này: `clasp push --force`, sau đó cập nhật deployment hiện có. Không chạy setupEquipmentApp hay tạo trigger email trong project mobile.

Tối ưu hiệu năng: mỗi thao tác chỉ đọc mỗi bảng cần dùng một lần; dữ liệu đã lưu được cập nhật vào bộ nhớ của chính thao tác đó. Đăng nhập và các nút tạo/nhận/gửi/xác nhận trả luôn snapshot mới, tránh gọi tải toàn bộ lần thứ hai. Bộ nhớ này không dùng chung giữa các thao tác; mỗi thao tác vẫn đọc tài khoản và quyền mới từ Sheets. Phản hồi chậm của phiên đã đăng xuất bị bỏ qua.

## Đổi mật khẩu

Menu Tài khoản có form mật khẩu hiện tại, mật khẩu mới và nhập lại mật khẩu mới. Mật khẩu mới dài 8–200 ký tự; lưu dạng băm trong đúng ô matKhau của tài khoản đăng nhập. Đổi xong đăng nhập lại bằng mật khẩu mới; các phiên cũ của tài khoản hết hiệu lực. Không cần sửa hoặc thêm cột trong Sheets.

## Loại yêu cầu

Tạo phiếu có ba lựa chọn: Sửa chữa (`repair`), Bảo dưỡng (`maintenance`), Làm mới (`new_work`). Làm mới dùng cùng luồng báo cáo/ảnh, trưởng ca xác nhận và hai PGĐ phê duyệt; không gắn lịch định kỳ hoặc làm thay đổi ngày bảo dưỡng. Kết quả được giữ trong bảng lịch sử công việc `LichSuSuaChua`, có ghi rõ Làm mới cùng mô tả yêu cầu; loại gốc giữ riêng ở `PhieuYeuCau.loaiYeuCau`.

## Nội dung bổ sung báo cáo

Hai ô Nội dung cải tiến (`noiDungCaiTien`) và Ý kiến đóng góp (`yKienDongGop`) nằm ngay sau Nội dung báo cáo, không bắt buộc. Lưu đúng hai cột cùng tên hiện có trong BaoCaoKhacPhuc, hỗ trợ lưu nháp/mở lại và hiển thị trong lịch sử, màn hình trưởng ca/PGĐ xác nhận. Không sửa header hoặc dữ liệu Sheets khi triển khai.

## Lọc ngày dùng chung

Các màn hình dữ liệu (danh sách phiếu, Giao cho tôi, Chờ xác nhận/phê duyệt, Kết quả và Lịch sử duyệt) mặc định theo ngày tạo phiếu trong 7 ngày gần nhất: hôm nay và 6 ngày trước, gồm cả hai đầu mốc. Ngày hôm nay lấy từ backend theo giờ Việt Nam. Bộ lọc Từ ngày–Đến ngày giữ khi chuyển menu; nút 7 ngày gần nhất trả về mặc định. Lọc ngay trên dữ liệu đã tải, không gọi lại server. Tạo phiếu/Tài khoản không có danh sách theo ngày; chi tiết giữ đầy đủ lịch sử của phiếu đang mở.

Menu Tổng quan đã bỏ. Đăng nhập, bấm logo hoặc đổi chế độ đều mở thẳng danh sách phiếu. Bộ lọc ngày gồm thanh tiêu đề/nút Lọc–7 ngày và hai ô ngày nằm cùng hàng; không có dòng ngày lặp. Tìm phiếu và chọn xưởng nằm cùng hàng để dành chỗ cho card nội dung. Đã kiểm tra bố cục ở320/360/390px.

Ô lọc ngày hiển thị cố định dd/mm/yyyy bằng chữ14px, độc lập định dạng ngày của trình duyệt. Bên dưới vẫn là inputdate gốc để chọn lịch, lưu giá trị ISOyyyy-mm-dd phục vụ bộ lọc.
