# Báo cáo theo mã kế toán — điều chỉnh đã xác nhận

Thay thế phần giao diện/khóa nhóm của thiết kế 2026-10-21 theo yêu cầu người dùng ngày 2026-10-22.

- Khóa nghiệp vụ là cặp `maNguyenLieu + tenNguyenLieu` đã trim. Mã kế toán không thuộc khóa này; chỉ là nguồn tồn và lựa chọn được phép của mỗi nhu cầu.
- Một dòng ngang theo nguyên liệu cho toàn bộ các tuần; khác mã hoặc khác tên phải tách dòng, không dùng lại cùng lượng tồn giữa hai nhóm.
- Menu con giống Báo cáo cũ: Forecast bán hàng, Nhu cầu nguyên liệu, Yêu cầu đặt hàng. Bỏ menu Chi tiết riêng, mở popup từ bảng.
- Tái sử dụng markup/CSS/logic Forecast và bộ lọc cũ trong namespace MktLegacy, ID riêng. Không sửa file Báo cáo cũ. Renderer nhu cầu/đặt hàng riêng nhận matrix từ thuật toán mới.
- Bảng hiển thị mã kế toán được dùng và ưu tiên; popup giữ đúng quyền riêng từng sản phẩm và chi tiết mua từng mã. Không suy diễn quyền từ hợp các mã ở dòng tổng.
- Xuất nhu cầu/đặt hàng bằng mảng giá trị gốc để ô số vẫn là số; Forecast tiếp tục dùng exporter cũ trong namespace riêng.
- Tồn thực tế từ kho ngoài chỉ để đối chiếu, không cộng vào tồn snapshot đang phân bổ. Thiếu tên không phân biệt được nhóm trong nguồn tồn thực tế thì để trống cột đó và cảnh báo; không chặn phân bổ hợp lệ.
- Nếu nguồn vận hành không có tên, chỉ được suy ra khi mã có đúng một tên trong nguồn vận hành. Không lấy tên từ nguồn đối chiếu để thay khóa vận hành.
- BOM nhiều nguyên liệu được dùng chung maDinhLuong; nhận diện dòng BOM bằng nội dung nghiệp vụ, không bắt maDinhLuong duy nhất toàn sheet.

Kiểm chứng: 39 ca node:test qua; trang ghép template động parse được, ID cũ/mới không trùng. Review độc lập: hai phát hiện Important được tái hiện và sửa bằng kiểm thử (nguồn tồn thực tế mơ hồ, Excel lẫn chữ nút). Không có minor để lại.
Chưa xác minh trực quan hoặc chạy nguồn Sheets thật: công cụ trình duyệt cục bộ lỗi Windows sandbox. Chưa push/deploy lần điều chỉnh này.
