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

## Đối chiếu ảnh hai menu

Đồng bộ bảng Yêu cầu đặt hàng bằng đúng class ô, chiều rộng cột tuần, xuống dòng tiêu đề, ô số 0 trống, ngày dd/MM/yyyy, màu âm/PO và summary khoảng tuần của báo cáo cũ. Render lại đưa cuộn ngang về đầu để cột tên/mã không nằm ngoài vùng nhìn.

Leadtime dùng TonKho.soNgayVeKho của mã kế toán; chỉ dùng cấu hình mặc định danh mục khi không có giá trị kho. Nếu nhóm có nhiều leadtime thì hiển thị danh sách giá trị, không chọn tùy ý một nhà cung cấp. PO của báo cáo dùng thứ Hai tuần kích hoạt trừ leadtime, ngày nhập dự kiến là đầu tuần kích hoạt, như BaoCaoGs.js; ngày cần dùng thật vẫn giữ trong chi tiết đề xuất. Chính sách này chỉ áp dụng đường báo cáo (reportCalendar=legacy).

Cột Tồn cuối là số dư dự kiến có thể âm: tồn vật lý còn lại của các mã hợp lệ trừ thiếu tích lũy. Không đổi số dư của bộ giải thành âm. Popup vẫn đối chiếu tồn vật lý không âm và phần thiếu riêng; XLSX lấy số dự kiến gốc. Nguồn đối chiếu tồn thực tế không đủ dữ liệu tiếp tục hiển thị dấu gạch và cảnh báo, không tự lấy tồn đầu để thay thế.

## Nhu cầu nguyên liệu theo sản phẩm

Theo xác nhận tiếp theo: chỉ báo cáo Yêu cầu đặt hàng tổng hợp theo nguyên liệu. Nhu cầu nguyên liệu phải nhóm theo sản phẩm, rồi mã+tên nguyên liệu, cột tuần hiển thị nhu cầu riêng sản phẩm. Danh sách mã được phép có nhãn Ưu tiên 0/1/2/3 và làm nổi bật ưu tiên cao nhất. Các dòng cùng nguyên liệu nhưng khác quyền BOM giữ riêng, không hợp quyền thành quyền chung.

Popup nhu cầu lọc theo sản phẩm và tập demandIds của đúng dòng/tuần được bấm; phân bổ, thiếu và mã đề xuất không lẫn dòng khác. Bảng tồn trong popup ghi rõ là toàn nguyên liệu dùng chung, không phải tồn riêng sản phẩm. Đề xuất mua vẫn là số lượng gộp được ghi chú rõ. XLSX nhu cầu có tên sản phẩm và lượng tuần dạng số.

## Sửa nguồn Forecast gây báo cáo rỗng

Đường báo cáo dùng KeHoachBanHang.nam + tuan và soLuongSKU, cộng các khách hàng như báo cáo cũ; không lọc trạng thái duyệt của kế hoạch sản xuất, không lấy soLuongSKUThucHien. Chỉ dùng ngày kế hoạch làm fallback khi dữ liệu cũ không có năm/tuần. Bộ lọc trạng thái BOM và quyền SuDung vẫn giữ nguyên. Chế độ này là options.forecast của adapter, không đổi chế độ kế hoạch sản xuất ở các lời gọi khác.

Cảnh báo riêng nguồn tồn thực tế không hiện trong Nhu cầu nguyên liệu; vẫn giữ ở báo cáo đặt hàng. Cảnh báo hiển thị theo danh sách trong details đóng mặc định, có giới hạn chiều cao. Có kiểm thử đối chiếu trực tiếp với backend báo cáo cũ trên cùng fixture Forecast nhiều khách hàng/chưa duyệt.
