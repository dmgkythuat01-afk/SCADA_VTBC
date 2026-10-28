# Phiếu xuất kho từ lịch sử sản xuất

Theo yêu cầu và xác nhận của người dùng: chọn một KHSX trong dữ liệu đã tải để hiện phiếu dưới bảng; một người cân cho mỗi phiếu. Tra KeHoachId trong ChiTietCanBatch, lấy nguoiCan rồi tra useName/name trong account (hỗ trợ Account). Không gửi mật khẩu về client.

Phiếu theo mẫu công ty Đức Minh Đồng Nai: tiêu đề, mã biểu mẫu BM-QT.KHO-01.05, thông tin phát hành, số/ngày để điền tay, người nhận, KHSX, lý do từ tenBaiLieu. Địa chỉ/bộ phận và địa điểm có ô nhập; trống in dấu chấm. Kho/ngăn lô và tên kho thực tế để điền tay. Cột vật tư dùng MaKeToan, đơn vị, số lượng giống nhau cho thực xuất/yêu cầu, lô, ngaySanXuatKho, hanSuDung. Một dòng nguồn giữ tổng số lượng; nhiều lô ghi nhãn tương ứng, không tự chia lượng.

## Approaches
Chọn tái sử dụng snapshot báo cáo hiện có, bổ sung metadata in và một module phiếu HTML độc lập; giữ bảng và Excel 11 cột. Không tạo một truy vấn bất đồng bộ riêng mỗi lần đổi kế hoạch (tránh phiếu sai do response cũ). Không dùng dịch vụ sinh PDF; mở bản HTML in trong cửa sổ riêng để người dùng chọn máy in hoặc lưu PDF.

Người dùng đã chốt bố cục và tra cứu trong hội thoại. Lựa chọn kỹ thuật của người thực hiện: A4 ngang để vừa 11 cột; tiêu đề bảng lặp khi nhiều trang; vùng chữ ký không bị tách trang. Chọn Tất cả, tải lại hoặc lỗi thì ẩn phiếu. Dữ liệu người nhận thiếu/mâu thuẫn phải cảnh báo, không chọn tên tùy ý; cho phép in dấu chấm để điền tay. Không thay đổi dữ liệu sheet hay quy trình xuất kho.
