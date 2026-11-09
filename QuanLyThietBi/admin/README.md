# Admin Nhập dữ liệu

App: https://script.google.com/macros/s/AKfycbys2ZTXnDl71K_HDVMf1lFGb1oEohD5CeI0N0H1s3qFBLE-0LLhqdinx7_dyYC9hgcs_Q/exec

Menu trái có Tài khoản, Bộ phận quản lý, Xưởng, Máy, Thiết bị, Chỉ tiêu kiểm tra. Các nhãn hiển thị tiếng Việt có dấu; đọc/ghi đúng các tiêu đề hiện tại, bao gồm ThongSoKyThuat và ThoiGianCapNhat. Không tự tạo thêm sheet/cột hoặc dữ liệu mẫu.

Nhập tài khoản và mã nhân viên, bộ phận quản lý, xưởng → máy → thiết bị → chỉ tiêu. Thiết bị chọn mã/tên người quản lý từ cùng dòng TaiKhoan; hai combobox đồng bộ, họ tên trùng được phân biệt bằng mã nhân viên. Chưa có maNhanVien thì tài khoản chưa xuất hiện trong danh sách chọn người quản lý.

Tìm kiếm/lọc tại trình duyệt; xóa lọc không tải lại server. Nút Tải lại lấy thay đổi mới nhất từ Sheets. Sau Lưu/Xóa, bảng và combobox cập nhật từ snapshot mới.

Khi thêm thiết bị: nhập thông tin → Thêm vào danh sách → sửa các ô cần thiết để nhập thiết bị tiếp theo. Các ô phía trên được giữ nguyên; bảng chờ lưu phía dưới có nút Bỏ dòng. Lưu tất cả chỉ lưu các dòng đã đưa vào danh sách (tối đa100/lượt), không tự thêm nội dung đang chỉnh ở phía trên. Cả danh sách được kiểm tra trước khi ghi một lượt; nếu lỗi, danh sách vẫn được giữ. Sửa thiết bị đã có vẫn lưu từng dòng như trước.

Đổi tên/xóa mục đang được tham chiếu sẽ bị chặn kèm số dòng liên quan, không tự xóa dây chuyền. Dòng bị thay đổi đồng thời cần tải lại trước khi lưu. Chu kỳ bảo dưỡng là số ngày nguyên dương; thời gian cập nhật do server điền.

Đăng nhập với tenDangNhap/matKhau và chucVu=admin (cũng nhận Quản trị/Quản trị viên), không tự tạo tài khoản hoặc thay mật khẩu khi triển khai. Tên đăng nhập không phân biệt hoa/thường. Mật khẩu không được trả về trình duyệt; khi sửa, để trống để giữ nguyên. Mật khẩu mới băm định dạng $eq$1$ tương thích cơ chế cũ; hỗ trợ mật khẩu nhập trực tiếp trong Sheets. Giữ nguyên AUTH_SECRET của project. Phiên6h, thử sai5lần chờ15phút; không được xóa/hạ quyền admin cuối cùng.

Các file: Schema.js (nhãn/cột/đọc ghi), Auth.js (xác thực/RPC), Data.js (CRUD/liên kết), Index/Styles/Client.html (giao diện). Clasp chỉ đẩy bộ mã admin/; không dùng bộ appscript/ lịch sử.

Kiểm thử từ repo root: node --test tests/equipment-admin/*.test.cjs. Triển khai từ QuanLyThietBi: clasp push --force, sau đó cập nhật deployment hiện có. Không chạy setup/seed/trigger cũ. Mobile vẫn dùng phiên bản thư viện20, chưa được thiết kế lại trong đợt này.
