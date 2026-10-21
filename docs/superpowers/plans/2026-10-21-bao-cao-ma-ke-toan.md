# Báo cáo theo mã kế toán Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Thêm ba báo cáo mới với phân bổ nguyên liệu tối ưu theo quyền dùng mã kế toán và tuần, không đổi cách tính cũ.

**Architecture:** Bộ giải thuần độc lập nhận nhu cầu và tồn đã chuẩn hóa. Backend đọc một snapshot Sheets, mô phỏng tuần và trả một kết quả dùng chung cho ba view. Frontend chỉ nối vào Index.html, không sửa các module cũ.

**Tech Stack:** Google Apps Script V8, HTML/CSS/JavaScript hiện có, Node.js built-in node:test/assert/vm; không thêm thư viện production.

**Spec:** `docs/superpowers/specs/2026-10-21-bao-cao-ma-ke-toan-design.md`

## Global Constraints

- Không sửa Code.js, BaoCaoGs.js, DonDatHangGs.js và các module cũ.
- Index.html chỉ thêm include và điểm móc menu/render/showView để đăng ký nhóm mới.
- Không ghi vào DeXuatDatHang; không tạo đơn mua thật.
- Không tự push/deploy trong phạm vi triển khai này.
- Hàm mới dùng tiền tố mkt để tránh trùng namespace Apps Script.
- Tên file backend khác tên HTML.
- Múi giờ Asia/Ho_Chi_Minh, năm/tuần ISO; tùy chọn hiển thị 4/8/12 tuần.
- Tối đa tổng lượng đáp ứng trước, sau đó tối ưu ưu tiên 0, 1, 2, 3 theo thứ tự từ điển.

## Review Focus

- Hai dòng BOM cùng sản phẩm có quyền mã khác nhau: không hợp nhất quyền (Task 2).
- Chi phí vector của cạnh ngược phải đảo dấu để tái phân bổ đúng (Task 1).
- Giữ chỗ chồng tuần không được tạo mua trùng và không trừ tồn thực (Task 3).
- Tải lỗi không để báo cáo cũ trông như dữ liệu mới; popup và hai bảng dùng cùng snapshot (Task 4).
- Số thập phân và mã có số 0 đầu không bị mất/đổi; dữ liệu Sheets không được chèn HTML (Tasks 2, 4).

## Task 1: Bộ giải luồng thuần

**Files:** Create `UocLuongDatHang/PhanBoMaKeToan.js`; test `tests/ma-ke-toan/allocation.test.cjs` và `tests/ma-ke-toan/helpers.cjs` (nằm ngoài thư mục clasp).

**Interfaces:** `mktAllocate({stocks, demands})` → `{allocations, shortages, balances, totals}`. Stock `{material, code, quantity}`; demand `{id, product, material, quantity, choices:[{code, priority}]}`; allocation `{demandId,code,priority,quantity}`. Bộ giải chỉ nhận một nguyên liệu mỗi lần; không truy cập Sheets.

- [ ] Viết test `example1400`, khẳng định tổng cấp 1400, thiếu 100, tổng từng mã không vượt 300/400/200/350/150 và mỗi cạnh đều hợp lệ; không khẳng định sản phẩm nào phải thiếu.
- [ ] Viết test `rerouteSharedStock`: tồn A=5,B=5; SP1 cần 5 dùng A0/B1, SP2 cần 5 chỉ A0; khẳng định cấp 10, SP1 nhận B, SP2 nhận A. Thêm test phân biệt tối ưu vector với tổng trọng số ưu tiên, số lẻ, nhu cầu rỗng, mã tắt và thứ tự dòng đảo.
- [ ] Chạy `node --test tests/ma-ke-toan/allocation.test.cjs`, xác nhận fail vì chưa có hàm.
- [ ] Cài đồ thị cạnh thuận/ngược và min-cost max-flow chi phí vector; dùng EPS=1e-9, sắp node/cạnh theo khóa chuẩn, kiểm tra bảo toàn tổng. Cạnh ưu tiên 0/1/2/3 có vector lần lượt [-1,0,0], [0,-1,0], [0,0,-1], [0,0,0]. Tìm đường tăng bằng Bellman-Ford với so sánh vector; chạy đến hết đường tăng.
- [ ] Chạy lại test, xác nhận tất cả pass; commit bộ giải và test.

## Task 2: Adapter nguồn và chuẩn hóa

**Files:** Create `UocLuongDatHang/BaoCaoMaKeToanGs.js`; test `tests/ma-ke-toan/adapter.test.cjs`.

**Interfaces:** `mktReadSnapshot()` → dữ liệu nguồn thuần; `mktBuildInputs(snapshot, options)` → `{weeks, demands, stocks, receipts, materialConfig, warnings}`. Đầu ra demand theo Task 1 cộng `weekIndex`; receipt `{weekIndex,material,code,quantity}`; config chứa unit/safety/pack/leadDays. Hàm đọc chỉ dùng helper đọc/chuẩn hóa hiện có, không gọi hàm ghi sheet.

- [ ] Đọc các block tạo nhu cầu/quy đổi/trạng thái hiện có trong Code.js và BaoCaoGs.js để ánh xạ chính xác tên cột cấu hình; ghi ánh xạ vào comment adapter.
- [ ] Viết test: SKU=100, định lượng=2, quy đổi=1, hao hụt=5 cho nhu cầu 210 dù có 4 mã; TRUE boolean/chuỗi bật đúng, rỗng/FALSE tắt; mã 001 giữ nguyên; mã lặp lấy priority thấp nhất; hai dòng cùng sản phẩm khác quyền vẫn tách demand; trùng maDinhLuong báo lỗi.
- [ ] Viết test thiếu cột SuDung0, quy đổi không tồn tại, số âm/nonfinite, năm ISO qua tháng 12, dữ liệu không có mã hợp lệ vẫn giữ nhu cầu thiếu.
- [ ] Chạy `node --test tests/ma-ke-toan/adapter.test.cjs`, xác nhận fail; cài adapter với khóa nguyên liệu+mã và trạng thái lấy từ ThamSo; không cộng tồn file ngoài vào TonKho.
- [ ] Chạy tests Task 1–2, xác nhận pass; commit adapter và test.

## Task 3: Mô phỏng tuần và đề xuất mua

**Files:** Extend `UocLuongDatHang/BaoCaoMaKeToanGs.js`; test `tests/ma-ke-toan/simulation.test.cjs`.

**Interfaces:** `mktSimulate(inputs)` → `{weeks, demandReport, purchaseReport, details, warnings}`; `mktGetReports({weeks})` gọi đọc→chuẩn hóa→mô phỏng, trả `{success:true,...result}`. Details chứa allocations/shortages/balances theo week/material; không trả Date hoặc Map qua Apps Script.

- [ ] Viết test tuần 1 cần 10, tồn 5, tuần 2 về 5: tuần 1 thiếu 5, không dùng hàng về sớm; test tồn dư chuyển tuần đúng và receipt chỉ cộng một lần.
- [ ] Viết test giữ chỗ N=2 cho cửa sổ chồng: một thiếu tương lai không tạo hai đề xuất; đề xuất chưa nhận không tăng tồn thực. Test safety áp dụng một lần cho nguyên liệu có 4 mã; pack=25 với thiếu 26 đề xuất 50; lead 7 ngày + buffer 3 ngày trừ đúng 10 ngày.
- [ ] Chạy test xác nhận fail; cài mô phỏng vật lý và sổ mua dự kiến riêng. Sổ dự kiến bao phủ thiếu đã lập trong cửa sổ, không cộng vào hàng về thật. Giữ trace phân biệt nhu cầu tuần/giữ chỗ/an toàn/quy cách.
- [ ] Chọn mã mua priority nhỏ nhất trong choices; không có choices thì cảnh báo không tạo mã mua. Gộp theo tuần cần/material/code trước làm tròn; trả lý do mua và sản phẩm nguồn.
- [ ] Chạy `node --test tests/ma-ke-toan/*.test.cjs`, xác nhận pass; commit mô phỏng và test.

## Task 4: Ba view, popup và nối menu

**Files:** Create `UocLuongDatHang/BaoCaoMaKeToan.html`, `UocLuongDatHang/JS_BaoCaoMaKeToan.html`, `UocLuongDatHang/BaoCaoMaKeToan_Style.html`; modify `UocLuongDatHang/Index.html` chỉ điểm nối; test `tests/ma-ke-toan/ui.test.cjs`.

**Interfaces:** frontend namespace `MktReports` với `renderMenu()`, `show(key)`, `hide()`, `load(weeks)`, `openDetail(week,material)`; keys `mktDemand`, `mktPurchase`, `mktDetails`. Một snapshot cho mọi view; gọi backend `mktGetReports` qua bridge `server` hiện có. CSS dưới `.mkt-reports`/`.mkt-modal`.

- [ ] Viết test với DOM stub cho điều hướng ba key, menu group đóng/mở, tải lỗi xóa snapshot, disable tải lặp; dữ liệu `<img onerror=...>` chỉ hiển thị text; chọn detail mở đúng tuần/material từ snapshot hiện có, không gọi API lần hai.
- [ ] Chạy test xác nhận fail; cài bảng nhu cầu, mua, chi tiết với các cột trong spec, bộ chọn 4/8/12 tuần, trạng thái tải/rỗng/lỗi và cảnh báo.
- [ ] Thêm ba include giao diện/CSS/JS và hook đăng ký menu/show/hide tối thiểu trong Index.html; không sửa nhánh xử lý tính toán cũ. Không override global function bằng monkey patch.
- [ ] Hiển thị tồn thật và sổ đề xuất dự kiến ở cột riêng, cảnh báo lead time trễ; bảng cuộn ngang và popup đóng được.
- [ ] Chạy tests Task 1–4; kiểm tra cú pháp tất cả script mới và Index.html sau ghép include; commit frontend và điểm nối.

## Task 5: Kiểm tra tích hợp và bàn giao

**Files:** Test `tests/ma-ke-toan/integration.test.cjs`; update thiết kế nếu cần ghi quyết định ánh xạ nguồn cụ thể.

**Interfaces:** Dùng API/UI đã định nghĩa; không thêm API mới.

- [ ] Thêm fixture end-to-end có hai sản phẩm trong ví dụ, hàng về tuần sau và hai BOM khác quyền; kiểm tra tổng cấp/thiếu và chi tiết khớp bảng tổng.
- [ ] Chạy `node --test tests/ma-ke-toan/*.test.cjs`; tất cả phải pass. Chạy test cũ nếu repository có runner được cấu hình; không tự gọi hàm test Apps Script có thể ghi Sheets.
- [ ] Soát `git diff` so với commit trước thực thi: Code.js/BaoCaoGs.js/DonDatHangGs.js không đổi; Index.html chỉ nối module; namespace và basename Apps Script không trùng.
- [ ] Kiểm tra runtime UI bằng browser nếu có harness phù hợp; nếu không, ghi rõ chưa thử trên Apps Script thật. Không gọi push/deploy khi chưa được yêu cầu.
- [ ] Commit kiểm thử tích hợp; bàn giao tóm tắt hành vi, lệnh kiểm tra/kết quả và các giới hạn xác minh thực tế.
