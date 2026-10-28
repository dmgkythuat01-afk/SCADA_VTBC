# Phiếu xuất kho Implementation Plan

> Execute inline with superpowers:executing-plans; preserve current workspace as previously authorized.

**Goal:** Xem và in phiếu xuất kho theo KHSX đã lọc.
**Architecture:** Snapshot báo cáo kèm metadata tối thiểu; module mẫu in độc lập dùng cùng dữ liệu với bảng.
**Tech Stack:** Google Apps Script, HTML/CSS, JavaScript, Node VM tests.
**Spec:** docs/superpowers/specs/2026-10-28-phieu-xuat-kho-in-design.md

## Global Constraints
- Giữ bảng/Excel 11 cột; lấy đúng khoảng ngày duyệt đã tải.
- Chỉ gửi useName/name phục vụ tra cứu; không gửi mật khẩu.
- Nhiều lô không lặp tổng số lượng; tên kho để trống, chữ ký điền tay.

## Review Focus
- Thiếu/mâu thuẫn người cân không được tự chọn tên.
- Lot/date list phải giữ đúng vị trí kể cả phần tử rỗng.
- Nội dung sheet có HTML phải được escape.
- Đổi bộ lọc/tải lại không giữ phiếu cũ.
- In nhiều trang phải lặp header và giữ khối chữ ký.

## Task 1: Snapshot dữ liệu in
- [x] Viết và chạy test metadata, tra người cân và giới hạn dữ liệu tài khoản.
- [x] Bổ sung metadata lô/ngày/mã kế toán và mapping tên người nhận theo KHSX.
- [x] Chạy kiểm thử backend.

## Task 2: Mẫu phiếu và hộp thoại in
- [x] Test mẫu có đúng cột, số lượng, placeholder và escape nội dung.
- [x] Tạo PhieuXuatSanXuatPrint.html, nối render/reset từ combobox.
- [x] Kiểm tra print window gọi print, nhiều trang và bảo toàn dữ liệu Excel.
- [x] Chạy toàn bộ kiểm thử liên quan, kiểm tra diff; phát hành qua Git/Apps Script.

## Validation
10 Node VM tests pass. Chrome headless screenshot of a three-line Vietnamese specimen inspected; 45-line specimen printed to multi-page A4 landscape PDF. Reviewer found independent lot/date stacks could misalign on wrapping; fixed with shared per-lot grid rows, preserving one total per material. Live Google Sheets contents and a physical printer were not accessed during verification.
