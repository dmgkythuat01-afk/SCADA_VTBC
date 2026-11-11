# DMG Mobile Quan ly thiet bi

## Luồng hiện hành — 11/11/2026

Menu Giao cho tôi có hai card, theo thứ tự Phân công ban đầu cho tôi (nguoiDuocGiao) rồi Giao cho tôi (nguoiDangXuLy). Cả hai giữ bộ lọc và nhóm theo xưởng. Phiếu tự phân công xuất hiện ở cả hai card. Bộ đếm trên menu tính mỗi phiếu chờ chính tài khoản này phân công/lập biện pháp/bàn giao một lần trong khoảng ngày đang chọn; không tính lại phiếu chỉ theo dõi hoặc đã hoàn thành.

Tạo phiếu → người được phân công ban đầu chọn người thực hiện (có thể chọn chính mình) → người thực hiện nhập Biện pháp thi công và Nội dung cải tiến → hai PGĐ Chất lượng/Sản xuất phê duyệt song song → được phép thi công → người thực hiện gửi ảnh, ngày thực tế và ghi chú bàn giao → chính người tạo phiếu xác nhận hoàn thành.

Chỉ người được phân công thực hiện mới soạn biện pháp hoặc gửi bàn giao. Không cho phép thêm ảnh bàn giao trước khi đủ hai PGĐ. Bàn giao cần ít nhất một ảnh, ghi chú tùy chọn; không sửa biện pháp đã được duyệt. Nếu bất kỳ PGĐ hoặc người tạo không đồng ý, phải gửi bản biện pháp mới và cả hai PGĐ duyệt lại từ đầu. Lịch sử hoàn thành chỉ ghi khi người tạo đồng ý nhận bàn giao, có chống ghi trùng khi mạng lỗi/gửi lại.

Phiếu cũ chưa hoàn thành chuyển về **Chờ phân công thực hiện**, giữ người phân công ban đầu. Các báo cáo, ảnh và chữ ký cũ vẫn còn để tra cứu; không dùng chữ ký cũ làm quyền thi công mới. Phiếu cũ đã hoàn thành giữ nguyên. Không thêm cột hoặc sheet; các trạng thái V2 và tiền tố nội bộ v2| trong maYeuCauChongLap giúp nhận diện luồng mới sau khi hoàn thành.

Phân công ban đầu giữ ở nguoiDuocGiao; người làm ở nguoiDangXuLy/tenNguoiDangXuLy. noiDungBaoCao là biện pháp; noiDungCaiTien giữ cải tiến; danhSachAnh và yKienDongGop lưu ảnh/ghi chú bàn giao. Các lần biện pháp và bàn giao có bản ghi riêng, giữ liên kết vòng duyệt trong mã nội bộ sẵn có.

Chữ ký trên bản in: hai PGĐ ký đúng bản biện pháp trước thi công; Xác nhận bởi phòng Cơ điện là người phân công ban đầu, thời gian lúc phân công; Bộ phận bàn giao là người làm, thời gian lúc gửi báo cáo bàn giao; Bộ phận tiếp nhận là người tạo phiếu, thời gian lúc đồng ý nhận bàn giao. QR ảnh vẫn yêu cầu đăng nhập. Mẫu in giữ A4 ngang, dấu ORIGIN/BẢN GỐC, hai loại Sửa chữa/Làm mới; tài khoản chỉ mở qua biểu tượng góc phải.

Các ghi chú về luồng trưởng ca xác nhận trước PGĐ bên dưới là mô tả lịch sử trước ngày 11/11/2026, không áp dụng cho phiếu mới hoặc phiếu đã chuyển luồng.


## In / Xuất PDF phiếu yêu cầu

Mở chi tiết phiếu rồi chọn **In / Xuất PDF**. Cửa sổ phiếu mở theo mẫu BM-QT-TB-01.05, khổ A4 ngang; chọn máy in hoặc Lưu dưới dạng PDF trong hộp thoại trình duyệt. Cửa sổ có nút In / Lưu PDF để gọi lại hộp thoại. Cho phép popup cho trang nếu trình duyệt đang chặn.

Thông tin người đề nghị và người được giao đọc từ TaiKhoan, gồm chucVuTrongCongTy, phongSanXuat, phongBan. Ô Xác nhận bởi phòng Cơ điện ghi người phân công ban đầu và thời gian phân công. Bộ phận bàn giao ghi người thực hiện và thời gian gửi báo cáo bàn giao; Bộ phận tiếp nhận ghi người tạo phiếu và thời gian đồng ý nhận bàn giao. Trưởng ban an toàn dùng chữ ký PGDChatLuong, Ban giám đốc dùng PGDSanXuat. Các chữ ký chỉ lấy từ cùng lần báo cáo, ô chưa ký để trống để ký tay. Có thể in khi chưa hoàn tất quy trình.

Ảnh có QR dẫn tới đúng ảnh trong ứng dụng, vẫn cần đăng nhập và quyền xem phiếu; không đổi ảnh Drive sang công khai. Nội dung dài và các ảnh ngoài ba ảnh đầu được giữ đầy đủ trong phụ lục. QR tạo tại trình duyệt, không gửi dữ liệu sang dịch vụ QR bên ngoài. Logo trên mẫu là bản vector dựng từ ảnh tham chiếu.

App dùng chung cho điện thoại và máy tính, tự đổi bố cục theo độ rộng màn hình.

Apps Script: https://script.google.com/d/1pslo6vQfhFAZlB_jVzjZQsrTgvdAMIZ4yS4emcVZW7eqqQziWhzBu3LQ/edit

App: https://script.google.com/macros/s/AKfycbzMajCHwyZ8ohRElBG5SKeE0jbG6orEIHXOUBh_bF611yGq8zLDgCZK-UrsBj8gPQQUhA/exec

Chủ project mở editor, chọn `capQuyenMobile` → Run → cấp quyền Google lần đầu cho project mới. Hàm chỉ đọc tên file Sheets và thư mục Drive, không sửa dữ liệu. Nếu link app hiện Truy cập bị từ chối trước khi cấp quyền, hoàn tất bước này bằng tài khoản sở hữu project.

Dùng chung file Sheets và tài khoản hiện có trong `TaiKhoan` với app quản trị. Không tự tạo tài khoản mẫu, bản sao danh mục hoặc trigger email. Các role TruongCa/CongNhan/PhongCongNghe tạo phiếu; KyThuat/CoKhi/TuDongHoa xem mọi phiếu và báo cáo; trưởng ca xác nhận rồi hai PGĐ duyệt song song. Người thực hiện được ghi theo tài khoản thực tế.

Project này chứa giao diện mobile/desktop, bộ lọc ngày và bản in. Backend nghiệp vụ nằm trong các file `MobileWork*.js` của `QuanLyThietBi/admin/`, gọi qua thư viện EquipmentCore và ghim phiên bản 55 trong manifest. Script Properties, Cache và Lock tạo bên trong thư viện thuộc backend dùng chung, theo tài liệu Google: https://developers.google.com/apps-script/guides/libraries#resource_scoping . Hai giao diện dùng cùng khóa cập nhật. Khi nâng cấp backend, kiểm thử và tăng version thư viện trong manifest; không bật developmentMode trên production.

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

## Bố cục điện thoại và máy tính

Dưới1024px giữ giao diện điện thoại, menu dưới và bộ lọc ngày gọn. Từ1024px dùng menu trái, nội dung rộng, bộ lọc trên một hàng, danh sách2cột (3cột từ1440px), form tạo phiếu/tài khoản/báo cáo tận dụng chiều ngang. Cùng một URL, tài khoản, phân quyền và dữ liệu; đổi kích thước không tải lại hoặc xóa dữ liệu đang nhập. Phần desktop nằm riêng trong DesktopStyles.html, không thay CSS điện thoại.

## Đề nghị ngày hoàn thành

Form tạo phiếu có ngày đề nghị hoàn thành, lưu vào PhieuYeuCau.ngayDeNghiHoanThanh. Hiển thị trên card và chi tiết cho các vai trò được xem phiếu. Có thể để trống; ngày hợp lệ lưu ISO và hiển thị dd/mm/yyyy. Trường này độc lập với ngày thực tế hoàn thành; không làm đổi lịch bảo dưỡng. Cột bổ sung đã đối chiếu nguyên vẹn các ô cũ của14sheet, không tạo phiếu mẫu.

Ngày đề nghị hoàn thành dùng cùng bộ chọn ngày gọn như Từ ngày/Đến ngày: hiển thị dd/mm/yyyy chữ14px, giữ inputdate gốc và tên trườngngayDeNghiHoanThanh, không tràn form trên điện thoại.
