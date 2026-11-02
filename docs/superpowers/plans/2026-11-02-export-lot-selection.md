# Export lot selection implementation plan

**Goal:** Preview FEFO stock allocations and let inventory staff choose lots of the fixed PCN material/accounting code before approving an export.

**Architecture:** Add focused Apps Script and browser modules. Preserve current voucher and stock APIs; public approval functions delegate to a locked validator/writer. Save exact per-lot stock quantities in a new `chiTietTruKho` column; cancellation prefers that ledger, with legacy FIFO snapshots retained for older vouchers.

**Tech stack:** Apps Script, existing HTML/JavaScript, Node tests, headless browser fixtures.

- [x] Test and implement preview, immutable material/code identity, fresh-stock validation and shared-lot capacity reservation.
- [x] Implement single-line and whole-voucher approval using explicit allocations; persist original stock IDs, metadata and exact deduction ledger.
- [x] Add per-line lot selectors, quantities, add/remove and FEFO reset; retain fixed accounting code and submit selected allocations.
- [x] Test and implement exact-ledger cancellation, including deliberately non-FEFO selections.
- [ ] Run regressions and browser interaction checks, review diff, push Git and both affected Apps Script projects. User handles deployment.
