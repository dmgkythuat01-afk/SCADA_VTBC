# Historical VTBC stock reconciliation

User authorized repair of legacy EpMangIn records that predate automatic inventory consumption. Match each container once by IdThungDungVi, move its entire remaining quantity from KetQuaLapVi.soLuongViDaLap to daXuat, and fill missing thoiGianXuat from the earliest valid EpMangIn.thoiGianLuu. Preserve already processed records and never infer missing quantities or ambiguous identities.

Preview found 32 events, 31 exact matches and one unmatched trailing-plus identifier. User explicitly confirmed that the trailing-plus record refers to the same T11 container, holding 624 trays; the approved alias was used only in the repair planner and EpMangIn was kept unchanged.

## Applied result

- 32 containers reconciled, 19,768 trays issued.
- Remaining inventory: 45,593 → 25,825. Issued: 0 → 19,768.
- Total assembled remains 45,593 (remaining + issued), so assembly progress is preserved.
- No unmatched or ambiguous record remains in this repair.
- Private snapshots were saved before each write phase. Hash guards reject source changes between backup and application; writes use the existing API project's ScriptLock.
- Verified every pre-existing cell against the planned result, preserved unrelated formulas, and confirmed EpMangIn unchanged. Timestamp comparison accounts for Google Sheets converting text into typed dates in Asia/Ho_Chi_Minh.
- A second planning pass proposes no further changes. Temporary repair endpoints were removed and original API source/deployment retained.

The reusable planner is stored in integrations/ViStockHistoricalRepair.js with tests. It is not installed in normal API execution and creates no periodic trigger. Backups and one-use credentials remain in the ignored local .superpowers directory.

29 PCN tests passed. Independent read-only review reran the backup assertions and confirmed the totals, unchanged cells/formulas/source events and idempotence with no important issue found.
