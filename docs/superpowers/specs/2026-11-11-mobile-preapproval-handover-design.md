# Luồng phân công — duyệt biện pháp — thi công — bàn giao

Ngày: 11/11/2026. Trạng thái: người dùng đã chốt các quy tắc và yêu cầu triển khai.

## Yêu cầu

Giữ Google Sheets, Drive, tài khoản, các cột và mẫu in đang dùng. Phiếu mới chỉ có Sửa chữa hoặc Làm mới. Hai PGĐ phải phê duyệt biện pháp trước khi người thực hiện được báo cáo thi công; sau thi công chính người tạo phiếu xác nhận bàn giao.

## Cách thực hiện đề xuất

Dùng các sheet và cột hiện có, bổ sung các giá trị trạng thái để phân biệt từng bước. Đặt nghiệp vụ mới trong file riêng, giữ phần xử lý phiếu cũ để tránh hiểu nhầm chữ ký đã có thành phê duyệt trước thi công.

Không đề xuất viết lại cả ứng dụng hoặc thêm các sheet song song: hai cách này làm phân tán lịch sử, trong khi các cột hiện tại đã có người được giao, người thực hiện, biện pháp, cải tiến, ảnh, ghi chú và lịch sử ký.

## Các bước và quyền thao tác

1. **Chờ phân công thực hiện:** người tạo chọn người phân công ban đầu như hiện tại. Tài khoản này nhận thông báo và chọn một tài khoản kỹ thuật đang hoạt động, có thể chọn chính mình. Lưu người phân công ban đầu ở nguoiDuocGiao, người thực hiện được chọn ở nguoiDangXuLy/tenNguoiDangXuLy. Không cho tài khoản kỹ thuật khác tự giành phiếu.
2. **Lập biện pháp:** chỉ người thực hiện được chọn soạn noiDungBaoCao (biện pháp thi công) và noiDungCaiTien. Có lưu nháp; biện pháp bắt buộc, cải tiến có thể trống như hiện tại. Không yêu cầu ảnh hoàn thành tại bước này. Nút gửi là Gửi BGD phê duyệt.
3. **Chờ hai PGĐ:** PGDChatLuong và PGDSanXuat nhận thông báo cùng lúc; mỗi người ký nhánh của mình, độc lập thứ tự. Bản gửi được khóa. Nếu một người từ chối, trả về người thực hiện sửa biện pháp; lần gửi mới cả hai PGĐ duyệt lại, không dùng chữ ký của bản cũ.
4. **Được phép thi công:** chỉ xuất hiện sau khi cả hai PGĐ đồng ý cùng bản biện pháp. Chưa ghi hoàn thành và chưa ghi lịch sử sửa chữa hoàn tất tại bước phê duyệt này. Người được giao mới mở được bước bàn giao.
5. **Báo cáo bàn giao:** người thực hiện bổ sung ảnh thi công và ghi chú tùy chọn; không phải nhập lại biện pháp/cải tiến đã được duyệt. Đề xuất ít nhất một ảnh khi gửi. Giữ ngày thực hiện để lưu ngày thực tế, độc lập ngày đề nghị hoàn thành. Khi gửi, người tạo phiếu nhận thông báo.
6. **Người tạo xác nhận:** chỉ đúng tài khoản tạo phiếu ký nhận bàn giao; bỏ yêu cầu mọi trưởng ca xác nhận thay người tạo ở luồng mới. Đồng ý thì hoàn thành và ghi lịch sử đúng một lần. Không đồng ý phải ghi lý do và trả về người thực hiện theo quy tắc cần chốt bên dưới.

Mỗi API kiểm tra quyền, trạng thái hiện tại và phiên bản dữ liệu ở server; không chỉ ẩn nút giao diện. Giữ khóa cập nhật dùng chung và chống gửi/trùng chữ ký khi bấm lại hoặc mạng chập chờn.

## Cột và lịch sử

- PhieuYeuCau: giữ nguoiDuocGiao cho phân công ban đầu; nguoiDangXuLy/tenNguoiDangXuLy cho người thực hiện; trangThai cho bước hiện tại; hai cột PGĐ giữ kết quả duyệt biện pháp; nguoiXacNhan/thoiGianXacNhan cho chính người tạo đã nhận bàn giao.
- BaoCaoKhacPhuc: giữ noiDungBaoCao, noiDungCaiTien cho biện pháp; danhSachAnh cho ảnh bàn giao; yKienDongGop cho ghi chú bổ sung; ngayThucHien cho ngày thực tế. Tách bản ghi/bản trạng thái biện pháp và bàn giao, liên kết bằng mã nội bộ trong trường chống trùng sẵn có để không ghi đè bằng chứng PGĐ đã ký.
- XacNhanKhacPhuc: giữ riêng quyết định hai PGĐ đối với đúng bản biện pháp và quyết định bàn giao đối với đúng lần bàn giao. Giữ tên người ký và thời gian thực tế.
- ThongBaoMobile: thông báo đúng người nhận ở mỗi bước. Không bổ sung việc gửi email ngoài phạm vi hiện tại.

## Giao diện và bản in

- Người nhận phân công ban đầu có nút Phân công thực hiện và combobox tài khoản kỹ thuật.
- Người thực hiện có các nút đúng giai đoạn: Soạn biện pháp, Gửi BGD, Báo cáo bàn giao.
- PGĐ thấy nội dung biện pháp/cải tiến trước thi công; không cần đợi ảnh hoàn thành để duyệt.
- Người tạo thấy Chờ nhận bàn giao và thao tác Đồng ý / Cần làm lại.
- Giữ truy cập tài khoản qua góc phải, không thêm lại menu Tài khoản.
- Bản in vẫn lấy biện pháp/cải tiến đã duyệt và QR ảnh bàn giao. Ô BGD/An toàn lấy hai chữ ký PGĐ trước thi công; Bộ phận tiếp nhận lấy người thi công đã gửi bàn giao; Bộ phận bàn giao lấy chính người tạo đã xác nhận. Không lấy chữ ký trưởng ca khác của luồng cũ cho phiếu mới. Chưa ký vẫn để trống để ký tay.

## Quyết định người dùng đã chốt

1. Khi người tạo từ chối bàn giao: phải trình lại cả hai PGĐ. Tạo vòng biện pháp mới, không dùng lại chữ ký cũ, chỉ được bàn giao mới sau hai phê duyệt mới.
2. Chuyển toàn bộ phiếu chưa hoàn thành sang luồng mới. Mọi trạng thái cũ chưa hoàn thành đưa về Chờ phân công thực hiện, giữ người phân công ban đầu; bỏ trạng thái duyệt hiện hành và con trỏ báo cáo hiện hành, nhưng giữ nguyên các bản ghi lịch sử, ảnh, biện pháp và chữ ký cũ để tra cứu. Phiếu đã hoàn thành không đổi.

## Kiểm tra trước triển khai

- Không được gửi bàn giao/ảnh hoàn thành trước khi đủ hai PGĐ, kể cả gọi API trực tiếp.
- Không được phân công/soạn/gửi bàn giao bởi tài khoản không có quyền trên phiếu.
- Hai thứ tự ký PGĐ đều hợp lệ; ký một người chưa cho phép thi công; từ chối làm hết hiệu lực vòng duyệt cũ.
- Người tạo (kể cả Công nhân) xác nhận được; trưởng ca khác không xác nhận thay.
- Gửi lại, mạng lỗi giữa chừng, trả lại bàn giao không tạo trùng lịch sử hoặc chữ ký.
- Kiểm tra riêng phiếu cũ và mới; bản in ghép đúng biện pháp, ảnh và chữ ký từng vòng; ảnh vẫn riêng tư.
- Kiểm tra điện thoại/desktop, các card chờ xử lý và thông báo; giữ bộ lọc ngày và các chức năng đang chạy.
