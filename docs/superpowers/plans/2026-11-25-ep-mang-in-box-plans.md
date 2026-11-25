# Ep mang in container plans

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** PCN selects available tray containers by product and reserves them in a film-printing plan, without deducting inventory.

**Architecture:** New EpMangInBoxesGs.js and EpMangInBoxesClient.html contain the feature. Existing RPC names delegate to the new backend; existing first eleven plan columns remain intact. New ChiTietKeHoachEpMangIn holds versioned container snapshots. Only details matching an active parent revision reserve containers. A single parent-row commit activates a completed detail revision. Cancellation retains history and releases reservations.

**Tech Stack:** Apps Script V8, Google Sheets, vanilla HTML/CSS/JS, Node tests.

## Approved requirements
- Product is resolved through KetQuaLapVi.IdLapVi -> KeHoachLapViVTBC.maSanPham/tenSanPham.
- Choose positive remaining containers, add/remove draft rows, enter positive integer plan quantity <= selected remaining total.
- Reserve whole selected containers for one active plan. Creating does not change KetQuaLapVi.
- Cancelling releases reservations. Worker QR enforcement is a later task.
- Focused new files preserve unrelated menus and existing records.

## Implementation decisions
- Keep STT compatibility; add IdEpMangIn (EMI + timestamp + collision suffix), phienBan, maYeuCau, thoiGianCapNhat, nguoiCapNhat.
- Detail columns: IdEpMangIn, STTKeHoach, phienBan, IdThungDungVi, IdLapVi, maSanPham, tenSanPham, ngaySanXuat, viTriKho, soLuongViKhiChon, trangThaiXuat, soLuongViDaXuat, thoiGianXuat, nguoiXuat, daXuatKhiChon.
- Header migration only appends missing named columns; no existing values or formulas are changed.
- Server checks auth, unique stock/plan mapping, current remaining stock, same product, duplicate selections, reservations across all dates, fresh parent revision, and execution/report state.
- Request key makes double submit/retry idempotent. Versioned details written before parent commit avoid partial reservations after write failures.
- Legacy records remain readable. Editing a legacy record requires selecting containers. No automatic backfill or invented reservations.

## Review focus
- Two admins choosing the same container: serialized revalidation permits only first commit.
- Old reservations outside five-day list still block stock selection.
- Stale edits and report/export data prevent unsafe revision/cancellation.
- Write failure leaves only inactive orphan detail revision; retry does not duplicate active plan.
- Product switch, delayed network response and refresh preserve valid draft or reject stale stock clearly.

## Tasks
- [x] Backend: failing tests for reservation, auth, create/retry/update/cancel, stale stock, duplicate IDs, legacy and fault injection; implement versioned persistence and append-only schema.
- [x] UI: new module integrated into existing menu; product/container choices, draft table, totals, create/edit/cancel/history details, stale-response guards and pending buttons.
- [x] Verify: 79 PCN/worker tests passed. Browser fixture QA passed product filter, add/remove, quantity validation, create/reserve, edit/release, cancel/audit and overflow checks at 1440 and 390. Independent reviewer confirmed no remaining PCN-scope blockers.
- [x] Release: remote baseline matched; live schema created with before/after checks preserving existing values/formulas in plans, tray stock, assembly plans and film-print events. PCN deployment version 36. No production plan or reservation was created during QA.

## Execution notes
- Active new plans remain visible beyond five days so admins can release old reservations; recently closed plans retain the five-day history behavior.
- Added parent lichSuYeuCau, thoiGianHuy, nguoiHuy. Committed request history supports retries after later edits; cancellation tombstone survives the legacy worker changing its report status.
- Existing-parent writes touch PCN fields only and commit the revision group last. They preserve report/formula columns and roll back earlier field groups on a failed write. Stock/report state is revalidated after detail staging.
- Reviewed limitation: PCN's lock cannot atomically coordinate with the separate current C#/worker writer. Shared final validation and QR enforcement belong to the explicitly deferred worker integration. This release never changes inventory.
- Live setup: 172 stock containers, 110 positive-stock mapped containers, one legacy plan retained, zero initial reservations. Temporary setup endpoint was removed and its deployment deleted.
