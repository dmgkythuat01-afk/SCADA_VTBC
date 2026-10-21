# Báo cáo theo mã kế toán — thiết kế

## Mục tiêu và phạm vi

Thêm module độc lập trong UocLuongDatHang theo yêu cầu đã xác nhận. Tối ưu sử dụng các mã kế toán được BOM cho phép theo từng nguyên liệu, sản phẩm và tuần. Giữ nguyên thuật toán, API, báo cáo và dữ liệu kết quả cũ. Không ghi vào DeXuatDatHang; không tạo đơn mua thật. Không tự push/deploy trong phạm vi triển khai này.

Nguồn yêu cầu: bản text người dùng cung cấp và ba nguyên tắc: giảm tổng thiếu trước; không chia đều mã dùng chung; mã riêng không bắt buộc dùng hết trước; ưu tiên 0–3 chỉ áp dụng sau mục tiêu đáp ứng nhu cầu.

## File và điểm tích hợp

- PhanBoMaKeToan.js: bộ giải thuần, không truy cập Sheets; kiểm tra tính khả thi, phân bổ và lưu vết.
- BaoCaoMaKeToanGs.js: đọc snapshot nguồn, chuẩn hóa, chạy mô phỏng tuần và trả dữ liệu báo cáo.
- BaoCaoMaKeToan.html: vùng giao diện riêng và popup.
- JS_BaoCaoMaKeToan.html: điều khiển menu, gọi API, lọc, bảng và popup.
- BaoCaoMaKeToan_Style.html: CSS giới hạn trong module.
- tests/ma-ke-toan/: kiểm thử Node cho bộ giải và adapter với dữ liệu giả lập.

Index.html chỉ thêm include và điểm móc menu/render/showView để đăng ký nhóm mới; không thay nội dung xử lý các view cũ. Không sửa Code.js, BaoCaoGs.js, DonDatHangGs.js và các module cũ. Hàm mới dùng tiền tố mkt để tránh trùng namespace Apps Script. Tên file backend khác tên HTML.

## Nguồn và chuẩn hóa

Đọc một lần mỗi lần tính: KeHoachBanHang, DinhLuong, TonKho, KeHoachHangVe, NguyenLieuVatTu, QuyDoiSKU, QuyDoiDonVi, ThamSo. Tồn đầu từ snapshot TonKho như thuật toán hiện tại, không cộng thêm tồn trực tiếp từ file ngoài. Kế thừa bộ lọc trạng thái kế hoạch/tồn/hàng về và quy đổi đơn vị hiện có qua hàm đọc thuần; không gọi hàm tính hay ghi kết quả cũ.

Mỗi dòng BOM giữ riêng nhu cầu và quyền dùng mã: MaKeToan/SuDung0, MaKeToan1/SuDung1, MaKeToan2/SuDung2, MaKeToan3/SuDung3. TRUE boolean hoặc chuỗi TRUE (không phân biệt hoa thường) là bật; FALSE/rỗng là tắt. Mã rỗng không tạo lựa chọn; mã lặp trong cùng dòng lấy mức ưu tiên tốt nhất. Không bật ngầm mã chính khi SuDung0 rỗng. Thiếu cột mới phải báo rõ, không dùng thuật toán cũ thay thế.

Nhu cầu = SKU × định lượng × quy đổi × (1 + hao hụt/100), chỉ tính một lần mỗi dòng định lượng hợp lệ. Dòng BOM lặp mã định lượng báo lỗi; nhiều dòng BOM có quyền khác nhau giữ thành các nút nhu cầu riêng, không hợp nhất quyền theo sản phẩm làm mở rộng sai quyền sử dụng.

Khóa tồn và hàng về là cặp maNguyenLieu + MaKeToan. Mã là chuỗi, giữ số 0 đầu. Đơn vị phải được quy về một đơn vị tính toán nhất quán cho nguyên liệu. Thiếu chuyển đổi, số âm, dữ liệu không hữu hạn hoặc khóa nguồn không đầy đủ trả cảnh báo/lỗi nêu nguồn; không âm thầm xem là tồn dùng được. Nguyên liệu không có mã được bật vẫn hiện nhu cầu thiếu và lý do không thể đề xuất mã mua.

## Tối ưu phân bổ mỗi tuần

Giải riêng từng nguyên liệu. Đồ thị nguồn → mã kế toán (sức chứa bằng tồn khả dụng) → nhu cầu BOM/sản phẩm được phép → đích (sức chứa bằng nhu cầu). Không tạo cạnh cho mã bị tắt. Dùng luồng cực đại chi phí nhỏ nhất với cạnh ngược để có thể điều chỉnh phân bổ trước đó; không dùng tham lam theo sản phẩm hoặc bắt buộc cấp hết mã riêng.

Mục tiêu theo thứ tự:

1. Cực đại tổng lượng cấp, tương đương tối thiểu tổng thiếu.
2. Trong các luồng cực đại, tối đa lượng cấp ưu tiên 0, sau đó 1, sau đó 2 (phần còn lại là 3). Chi phí dạng vector so sánh từ điển, tránh trọng số vô hướng quá lớn và tràn số.
3. Nếu còn ngang nhau, thứ tự duyệt chuẩn theo mã nguyên liệu, mã kế toán, mã sản phẩm, mã định lượng bảo đảm kết quả tái lập không phụ thuộc thứ tự dòng Sheets. Không cam kết SP001 luôn đủ trong ví dụ khi nhiều phương án tối ưu.

Khối lượng giữ chính xác trong tính toán, dùng epsilon thống nhất để so sánh dư lượng; chỉ làm tròn khi hiển thị. Kiểm tra tổng cấp mỗi mã không vượt tồn, mỗi nhu cầu không vượt nhu cầu, quyền dùng mã đúng và bảo toàn tồn. Không dùng tổng số sản phẩm đủ thay cho tổng lượng nhu cầu được đáp ứng.

## Mô phỏng tuần và đặt hàng

Hiển thị 4/8/12 tuần như báo cáo hiện tại, bắt đầu thứ Hai tuần hiện tại theo Asia/Ho_Chi_Minh, khóa gồm năm ISO và tuần. Tính thêm các tuần giữ chỗ cần thiết ngoài vùng hiển thị.

Mỗi tuần: tồn cuối tuần trước + hàng về đủ điều kiện trong tuần → phân bổ nhu cầu tuần → tồn cuối thực tế. Hàng về chỉ nhập một lần, không dùng trước tuần nhận. Phần thiếu tuần trước được báo ở tuần đó, không tự trừ lại tồn tương lai. Lượng đề xuất chưa phải đơn hàng/hàng về và không tự nhập tồn vật lý.

Giữ chỗ N tuần: dùng mô phỏng phụ trên tồn còn lại và hàng về đúng tuần để đánh giá nhu cầu tương lai; không trừ lần hai khỏi tồn vật lý. Chỉ phần thiếu chưa được bao phủ bởi hàng về và đề xuất mua đã lập trong sổ dự kiến mới sinh đề xuất tiếp theo, tránh lặp mua cùng thiếu khi cửa sổ giữ chỗ chồng nhau. Sổ đề xuất dự kiến tách khỏi tồn/hàng về thực và được hiển thị rõ là giả định.

Đề xuất cơ sở của mỗi nhu cầu thiếu chọn mã được bật có thứ tự nhỏ nhất. Gộp theo tuần cần, nguyên liệu, mã kế toán; giữ danh sách sản phẩm nguồn. Tồn an toàn áp dụng một lần ở cấp nguyên liệu theo cấu hình hiện có, không nhân lên theo số mã; phân bổ phần bổ sung tới mã ưu tiên hợp lệ bằng thứ tự ổn định và ghi lý do. Không có mã hợp lệ thì cảnh báo, không tự tạo mã mua.

Quy cách đặt và lead time dùng cấu hình hiện có; làm tròn lượng mua lên bội quy cách dương sau khi gộp. Ngày cần đặt = ngày cần dùng trừ lead time và số ngày dự phòng. Cảnh báo nếu đã trễ. Không dùng hàng về muộn để che phần thiếu của tuần trước. Khi nguồn cấu hình chỉ có cấp nguyên liệu, áp dụng cùng cấu hình cho các mã của nguyên liệu và thể hiện rõ trong chi tiết.

## API và giao diện

Một API đọc mktGetReports({weeks:4|8|12}) trả snapshot dùng chung gồm metadata tuần/đơn vị, cảnh báo, báo cáo nhu cầu, đề xuất, chi tiết phân bổ và số liệu đối chiếu. Hai báo cáo và popup dùng cùng lần tính, không chạy độc lập dẫn đến khác kết quả. Cache trong trình duyệt theo số tuần; tải lại thay cả snapshot. Không tạo cơ chế xác thực mới; tích hợp theo cơ chế ứng dụng hiện có.

Nhóm menu Báo cáo theo mã kế toán có Nhu cầu nguyên liệu, Yêu cầu đặt hàng, Chi tiết phân bổ. Chi tiết là view chọn tuần/nguyên liệu; hai báo cáo có nút mở popup cùng dữ liệu. Đổi view ẩn vùng module mới; không che hoặc sửa báo cáo cũ. Có trạng thái đang tải, rỗng, lỗi, cảnh báo, chống bấm tải lặp và không hiển thị kết quả cũ như lần tính mới khi lỗi.

Báo cáo nhu cầu hiển thị tuần, nguyên liệu, đơn vị, mã được phép và ưu tiên, nhu cầu, tồn khả dụng không trùng, tổng cấp, thiếu, nút Chi tiết. Đề xuất hiển thị mã mua/ưu tiên, thiếu cơ sở, giữ chỗ, an toàn, lượng điều chỉnh quy cách, hàng về, tồn được cấp, sản phẩm nguồn, ngày cần/đặt và Xem phân bổ. Popup/view chi tiết hiển thị cấp theo sản phẩm–mã, tồn đầu, hàng về, đã cấp, tồn cuối, thiếu và lý do đề xuất. Bảng cuộn ngang; nội dung từ Sheets phải escape.

## Kiểm chứng và tiêu chí nghiệm thu

- Ví dụ 700/800 với tồn 1.400: cấp tổng 1.400, thiếu 100; không bắt buộc ma trận minh họa cụ thể.
- Trường hợp tham lam ưu tiên 0 gây thiếu: luồng phải điều chỉnh để đạt tổng cấp tối đa.
- Mã riêng, mã chung, mã tắt, mã lặp, không có mã hợp lệ, tồn thừa/thiếu và lượng thập phân.
- Đảo thứ tự kế hoạch/BOM/tồn không thay kết quả.
- Ưu tiên chỉ tối ưu sau tổng lượng cấp; kiểm tra thứ tự từ điển 0 rồi 1 rồi 2.
- Hàng về đúng tuần, chuyển tồn, năm ISO, giữ chỗ chồng nhau, không cộng hàng về/nhu cầu/đề xuất hai lần, an toàn không nhân bốn, quy cách và lead time.
- Kiểm tra quy đổi, thiếu cột, boolean Sheets, lỗi nguồn; bảng rỗng và dữ liệu tiếng Việt.
- Kiểm tra namespace/tên file, cú pháp backend/frontend, include, menu mới và điều hướng về module cũ.
- Soát diff chứng minh thuật toán và module cũ không bị đổi; chỉ có điểm nối tối thiểu trong Index.html.

Kiểm thử cục bộ không thay thế kiểm thử dữ liệu Apps Script thật. Khi bàn giao nêu rõ phần đã kiểm tra và phần cần người dùng thử sau deploy.
