Kiểm tra từ thư mục solution bằng PowerShell 7:
  ./tests/RunChecks.ps1

MaterialSaveTests kiểm tra chọn riêng nguyên liệu đã đủ batch, từ chối thiếu/trùng batch,
tách kế hoạch, giữ nguyên dữ liệu nguyên liệu khác và XML phục hồi bản lưu dở.
Kiểm tra thêm quy tắc theo loại, batch tiếp theo sau khi mở lại, giới hạn số lượng,
thử gửi lại batch đã lưu, xung đột ID/số thứ tự và thứ tự batch liên tục.
Các kiểm thử dùng DataTable mô phỏng dữ liệu SQL, chưa kết nối SQL/Sheets thật.
CompileCheck biên dịch toàn bộ source trong bộ nhớ với reference .NET Framework 4.6.1
và COM interop đã có trong obj/Debug. Đây không phải build đóng gói WinForms.

Kiểm tra trên máy vận hành với kế hoạch thử:
1. Cân đủ batch nguyên liệu A, chọn A, lưu khi B cùng nhóm vẫn chưa cân.
2. Kiểm tra SQL và Sheets có đúng batch A; dòng A chuyển xanh.
3. Khởi động lại, chọn lại kế hoạch: A không cho thêm cân, B vẫn cân/lưu được.
4. Nguyên liệu Thường: chọn khi chưa đủ batch thì không cho lưu.
   Màu mùi: kế hoạch 3 batch, cân/lưu batch 1 rồi thoát phần mềm. Mở lại,
   chọn cùng kế hoạch/nguyên liệu: dòng vàng 1/3, vẫn cân được batch 2 và lưu riêng.
   Lưu batch 3 xong: dòng xanh 3/3, khóa thêm cân và lưu cho nguyên liệu này.
   Mở lại lần nữa: vẫn xanh/khóa, nguyên liệu khác chưa đủ vẫn tiếp tục được.
   Nếu có nhiều batch Màu mùi trong bảng tạm, mỗi lần bấm lưu lấy một batch
   kế tiếp của nguyên liệu đang chọn; các batch còn lại được giữ trong bảng tạm.
5. Ngắt mạng khi gửi Sheets: bản PendingCanNguyenLieu.xml nằm trong
   %LOCALAPPDATA%/CanScadaVienTreoBC. Mở lại và bấm lưu để gửi tiếp;
   kiểm tra SQL không bị nhân bản và các IdBatch Sheets đã nhận được bỏ qua khi thử lại.
6. Thử hoàn thành toàn bộ kế hoạch, kiểm tra kế hoạch bị khóa cân như trước.

Chỉ dữ liệu đã bấm xác nhận lưu mới có bản lưu dở trên đĩa.
Không đảm bảo chống ghi lặp khi nhiều máy cùng gửi Sheets; việc này cần khóa/idempotency
ở Apps Script. Không chỉnh Apps Script hoặc ghi vào hệ thống thật trong quá trình kiểm tra.
