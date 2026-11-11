# Admin Nhập dữ liệu

App: https://script.google.com/macros/s/AKfycbys2ZTXnDl71K_HDVMf1lFGb1oEohD5CeI0N0H1s3qFBLE-0LLhqdinx7_dyYC9hgcs_Q/exec

Menu Nhập dữ liệu có Tài khoản, Bộ phận quản lý, Xưởng, Máy, Thiết bị, Chỉ tiêu kiểm tra. Các nhãn hiển thị tiếng Việt có dấu; đọc/ghi đúng các tiêu đề hiện tại, bao gồm ThongSoKyThuat và ThoiGianCapNhat. Menu này không tự tạo thêm sheet/cột hoặc dữ liệu mẫu.

Nhập tài khoản và mã nhân viên, bộ phận quản lý, xưởng → máy → thiết bị → chỉ tiêu. Thiết bị chọn mã/tên người quản lý từ cùng dòng TaiKhoan; hai combobox đồng bộ, họ tên trùng được phân biệt bằng mã nhân viên. Chưa có maNhanVien thì tài khoản chưa xuất hiện trong danh sách chọn người quản lý.

Tìm kiếm/lọc tại trình duyệt; xóa lọc không tải lại server. Nút Tải lại lấy thay đổi mới nhất từ Sheets. Sau Lưu/Xóa, bảng và combobox cập nhật từ snapshot mới.

Khi thêm thiết bị: nhập thông tin → Thêm vào danh sách → sửa các ô cần thiết để nhập thiết bị tiếp theo. Các ô phía trên được giữ nguyên; bảng chờ lưu phía dưới có nút Bỏ dòng. Lưu tất cả chỉ lưu các dòng đã đưa vào danh sách (tối đa100/lượt), không tự thêm nội dung đang chỉnh ở phía trên. Cả danh sách được kiểm tra trước khi ghi một lượt; nếu lỗi, danh sách vẫn được giữ. Sửa thiết bị đã có vẫn lưu từng dòng như trước.

Đổi tên/xóa mục đang được tham chiếu sẽ bị chặn kèm số dòng liên quan, không tự xóa dây chuyền. Dòng bị thay đổi đồng thời cần tải lại trước khi lưu. Chu kỳ bảo dưỡng là số ngày nguyên dương; thời gian cập nhật do server điền.

Đăng nhập với tenDangNhap/matKhau và chucVu=admin (cũng nhận Quản trị/Quản trị viên), không tự tạo tài khoản hoặc thay mật khẩu khi triển khai. Tên đăng nhập không phân biệt hoa/thường. Mật khẩu không được trả về trình duyệt; khi sửa, để trống để giữ nguyên. Mật khẩu mới băm định dạng $eq$1$ tương thích cơ chế cũ; hỗ trợ mật khẩu nhập trực tiếp trong Sheets. Giữ nguyên AUTH_SECRET của project. Phiên6h, thử sai5lần chờ15phút; không được xóa/hạ quyền admin cuối cùng.

Các file: Schema.js (nhãn/cột/đọc ghi), Auth.js (xác thực/RPC), Data.js (CRUD/liên kết), Index/Styles/Client.html (giao diện). Clasp chỉ đẩy bộ mã admin/; không dùng bộ appscript/ lịch sử.

Kiểm thử từ repo root: node --test tests/equipment-admin/*.test.cjs. Triển khai từ QuanLyThietBi: clasp push --force, sau đó cập nhật deployment hiện có. Không chạy setup/seed/trigger cũ. Mobile vẫn dùng phiên bản thư viện20, chưa được thiết kế lại trong đợt này.

## Quản lý thiết bị — module riêng

Các file MaintenanceDomain/Store/Service/Reports.js và MaintenanceClient/Dialogs/Styles/Export.html quản lý bảo dưỡng, sửa chữa và hồ sơ. Tích hợp vào khung app bằng menu riêng; API nhập dữ liệu vẫn giữ nguyên. Danh mục đã có lịch sử sẽ được bảo vệ khỏi đổi mã/vị trí hoặc xóa để không mất liên kết.

- Thông báo bảo dưỡng: quá hạn giữ đỏ, đến hạn hôm nay, 14 ngày tiếp theo, chưa đủ thông tin. Có tìm kiếm, lọc và Excel.
- Hạn = ngày thực tế hoàn thành bảo dưỡng gần nhất + soNgayCanBaoDuong; chưa có lịch sử thì ngày lắp đặt + chu kỳ. Sửa chữa và bảo dưỡng chưa hoàn thành không thay đổi hạn. Thiết bị ngừng sử dụng không nhắc lịch.
- Lịch sử bảo dưỡng/sửa chữa: ngày thực hiện, tài khoản/họ tên thực tế, nội dung, kết quả, chỉ tiêu kiểm tra và nhiều ảnh. Hoàn thành bảo dưỡng cần nhập kết quả thực tế và Đạt cho các chỉ tiêu. Nếu chưa đạt thì lưu Chưa hoàn thành, sau đó ghi một lần hoàn thành mới khi xử lý xong. Lịch sử trong app chỉ thêm, không sửa/xóa.
- Hồ sơ: cây Xưởng → Máy → Thiết bị có +/−; thông tin, hạn, chỉ tiêu và cả hai loại lịch sử.
- Excel .xlsx được tạo trong trình duyệt, dùng đúng bộ lọc và xuất toàn bộ kết quả (bảng giới hạn hiển thị200 dòng mỗi lần). Ảnh trong file xuất là liên kết Drive riêng tư; xem ảnh trong app qua API admin.

Sheet mới: LichSuBaoDuong, LichSuSuaChua, CauHinhBaoDuong, NhatKyThongBaoBaoDuong. Hàm chủ project khoiTaoQuanLyBaoDuong tạo cấu trúc, thư mục Drive riêng, hai trigger baoCaoBaoDuongDinhKy_ vào thứ Hai/thứ Sáu8–9h Việt Nam; đối chiếu digest của sáu danh mục trước/sau. Không tạo lịch sử mẫu và không gửi email khi khởi tạo.

Email mặc định nhận tại tài khoản Google triển khai. Đổi danh sách/bật tắt trong Thông báo bảo dưỡng → Cấu hình email. Báo cáo gồm quá hạn, hôm nay, 14ngày tới, gửi một lần mỗi ngày báo cáo. Nhật ký lỗi hiển thị trong app. Nếu MailApp đã gửi nhưng ghi nhật ký lỗi, trạng thái sending được giữ để kiểm tra trước khi gửi lại, tránh tự gửi trùng.

Email hiển thị tối đa100 thiết bị ưu tiên theo hạn để báo cáo gọn; số tổng hợp tính trên toàn bộ danh sách. App và Excel hiển thị/xuất đầy đủ theo bộ lọc.

Ảnh hỗ trợ chọn nhiều/chụp, tối đa12JPEG, mỗi ảnh tối đa3MB sau thu nhỏ. Không chia sẻ công khai thư mục; chỉ phiên admin được đọc ảnh thuộc một bản ghi lịch sử. Nếu hủy sau khi tải ảnh hoặc lỗi khi lưu, file chưa liên kết vẫn riêng tư trong thư mục, không được đưa vào lịch sử.

## Cập nhật danh mục 11/11/2026

DanhMucThietBi không còn cột soNgayCanBaoDuong. DanhMucCanKiemTra dùng boPhanDanhGia (Điện/Cơ khí), loai và tanSuat. Loại và Tần suất lấy hai danh sách độc lập từ ThamSoHeThong; tải lại dữ liệu sau khi đổi tham số. Form đặt ba lựa chọn sau thiết bị; bảng giữ thứ tự cột vật lý. Checklist và lịch sử lưu cả ba trường. Chưa chuyển thuật toán nhắc hạn cũ sang lịch riêng theo từng chỉ tiêu/tanSuat; thiết bị thiếu chu kỳ cũ không tự suy diễn hạn mới.

## Tạm gỡ module bảo dưỡng 11/11/2026

Admin chỉ còn sáu danh mục Nhập dữ liệu. Giao diện bảo dưỡng cũ chuyển ra archive ngoài rootDir Apps Script; API quản trị cũ từ chối truy cập, handler email định kỳ không gửi nữa. Giữ các hàm nội bộ còn được mobile sửa chữa dùng; không xóa/chỉnh dữ liệu Sheets hay ảnh Drive. Lỗi tải dữ liệu khi còn ở màn hình đăng nhập hiện ngay tại form đăng nhập.
