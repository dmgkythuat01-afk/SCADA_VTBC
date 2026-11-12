# Mobile maintenance implementation plan

Approved scope: three maintenance tabs, partial machine checklists, filters through checklist category, PBD timestamp IDs on first save, no printing yet. Existing repair workflow stays intact.

- [x] Add isolated domain/store/API files. A single PhieuBaoDuong row stores the immutable checklist/results/photos snapshot, allowing one atomic write, replay keys, draft revision checks and partial completion.
- [x] Add independent mobile UI/styles and bridge endpoint; connect one navigation entry. Group by equipment/category, choose one configured result per parameter, preserve drafts, history/details and private photos.
- [x] Calculate per-parameter due dates from last actual completion; parameter frequency overrides category fallback. Unknown baselines stay explicitly unknown. Drafts do not advance dates.
- [x] Test partial saves, authentication, retries, tampering, changed checklists, calendar boundaries, mobile/desktop layout and original app regressions.
- [x] Create only missing maintenance sheet/headers, preserve all existing sheets, deploy existing URLs and push Git.

Implementation choices: technical/admin accounts write; other authenticated roles read. A completed phiếu is immutable; draft edits belong to its creator. Up to 100 result rows and 12 private photos per phiếu. No new approval steps are assumed. No print/PDF feature.
