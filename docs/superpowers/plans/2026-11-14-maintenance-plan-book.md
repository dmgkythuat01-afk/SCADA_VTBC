# Maintenance plan book implementation plan

**Goal:** Add an annual maintenance book with editable months, persistent Google Sheets storage and landscape printing.

**Architecture:** Isolated backend and frontend modules, with a fourth tab in the existing maintenance area. Read categories exclusively from DanhMucSoKH and include all catalog devices in sheet order. Store a versioned JSON document per year/workshop/department in SoKeHoachBaoDuong.

**Constraints:** No automatic month allocation. Preserve mobile layout and existing maintenance workflows. Only technical/admin users can save. Existing sheets remain intact.

- [x] Add catalog projection and authenticated versioned storage; test missing categories, ordering and concurrent saves.
- [x] Add filters, editable annual table and save/reload controls; protect unsaved changes.
- [x] Add A4 landscape print with full month grid and repeatable headers.
- [x] Expand desktop maintenance content, retain mobile sizing.
- [x] Run regression tests, provision storage, deploy backend/mobile and verify remote versions.
