# VTBC stock implementation plan

**Goal:** Separate current tray stock and lifetime assembly progress; consume a container when a new EpMangIn record is saved.

**Architecture:** Header-driven read-only PCN report with product lookup by IdLapVi. API export helper uses the writer's existing script lock, consumes each matching container once, preserves original counts in daXuat and first export time. No timer or spreadsheet edit trigger (API writes do not fire onEdit).

**Approved design:** Kho bán thành phẩm follows Kho nguyên liệu. Card Tồn kho vỉ VTBC filters product, detail/all-date total modes. A separate Theo dõi tiến độ lắp vỉ card shows planned, assembled, exported, remaining stock. Stock uses only soLuongViDaLap; progress uses soLuongViDaLap + daXuat.

## Tasks
- [x] Test and implement read-only stock domain/API, unknown products remain visible.
- [x] Add separate UI files and wire menu/lazy load; filters operate locally.
- [x] Test and implement idempotent export helper, fail before writes for missing/ambiguous IDs; retry repairs stock after append without duplicating export counts.
- [x] Patch actual API source and preserve progress totals in PCN and worker app. Exported container quantity cannot be restored by stale edits.
- [x] Run focused/regression tests and browser checks, review changes, identify and update deployed projects.

## Review focus
Repeated API requests, reordered/extra columns, multiple production dates, missing/duplicate plan or container IDs, progress after full stock export. Historical EpMangIn rows are not retroactively applied.

## Implementation and verification

- PCN v33, worker v39, EpMangIn API v8 deployed on existing URLs. Actual external API file was patched too; credentials are excluded from Git.
- Shared API writer serializes worker quantity/location edits and EpMangIn consumption under one ScriptLock. Worker reads daXuat separately and includes it only in progress; remaining stock inputs stay separate.
- Source preflight confirmed PCN/worker/API matched baseline before edits. Live schema setup preserved all existing inventory values and other sheets; report read 66 containers, 1 product and 8 plans without warnings.
- 25 PCN tests passed, covering remaining/progress separation, all-date totals, idempotent export, bad IDs/counts, stale worker edits after export, original schema and location alias.
- Desktop/mobile browser checks passed; scripts of both pages parsed successfully. Independent review found no remaining important issue after fixes.
- Worker owner authorized external requests. Live worker→API smoke succeeded using an intentionally invalid request; no inventory changed. Canonical sources restored after temporary checks.
- Full repository run: 379/381 passed before the last four regression tests were added. Two unrelated baseline failures remain: equipment mobile test expects obsolete loginMobile method; worker-export photo parser does not replace an existing SSO template token. Those files were not modified by this feature.
