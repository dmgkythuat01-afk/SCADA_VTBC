# Parallel deputy-director approvals

User requests three new TaiKhoan roles and two new PhieuYeuCau columns: trangThaiPGDChatLuong and trangThaiPGDSanXuat. Technical report -> shift-leader confirmation -> parallel quality/production deputy approvals -> completion. Neither deputy waits for the other; only the pair completes and appends current admin history/advances maintenance date. PGDCongNghe views/tracks requests without signing either branch. Current requester creation permissions stay otherwise unchanged.

User confirmed: any current TruongCa can confirm; rejection returns to technical rework and a fresh report/shift confirmation resets both branches. No department/workshop assignment mapping exists in current TaiKhoan. No sample accounts, no edits to credentials or completed historical requests. Existing completed requests with blank deputy fields remain historical completions. Active requests follow the new approval flow.

Use existing immutable XacNhanKhacPhuc ledger for stage, decision, authenticated actor, timestamp, comments and report ID. Deputy decisions use separate branch action identifiers; only own role can write its column. Per-report branch status validation allows both deputies to act from the same pre-approval screen revision; fresh report ID prevents applying a signature to rework. Replayed/partially written ledgers reconcile under the existing shared lock and history writes remain exactly once. First or deputy rejection prevents finalization. Keep per-operation IO optimization and combined response behavior.

Add MobileWorkApprovals.js, guarded workflow hooks and mobile UI for pending approvals, both status badges and signing history. Add only the two requested sheet columns using a fixed owner migration that verifies original cells across every existing sheet. Test both signing orders, concurrent stale global revisions, own-role isolation, pre-shift denial, missing first/second signature, rejection/rework/reset, stale report replay, partial writes, actor and private photo restrictions, old completed records, all existing catalog/maintenance and performance regressions. Browser-test new roles and pipeline; deploy pinned backend/mobile versions, verify live roles/read-only snapshots, push Git.

## Verified release

39 Node tests passed. Chrome mobile exercised worker creation, technician checklist/photo, shift-leader confirmation, both deputy signing orders, rejection/rework/reset and read-only technology deputy. History remained empty until both signatures; no redundant snapshot RPCs or uncaught browser errors.

Live migration appended exactly the two requested columns and verified all original cells across14sheets unchanged. The three existing deputy accounts authenticated with correct branch/view permissions; no account or email changes. Backend46 and mobile9 deployed on existing URLs. Actual mobile-library verification passed all10roles. One-use migration/diagnostic deployments removed; canonical source restored.
