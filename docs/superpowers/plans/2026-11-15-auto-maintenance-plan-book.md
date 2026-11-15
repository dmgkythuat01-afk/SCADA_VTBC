# Automatic maintenance book implementation plan

**Goal:** Populate a read-only annual book from completed PhieuBaoDuong records and automatically persist it in SoKeHoachBaoDuong.

**Design:** Match workshop/machine/device/category/assessment department. Use ngayThucHien as the actual work date; show sorted distinct dates per month, separated by newlines. Only details with a nonblank assessment from Hoàn thành records count. Classification confirmed: only loai=Bảo dưỡng or Thay mới determines the corresponding action; no inference from parameter name or assessment result.

- [x] Add pure date aggregation tests for completed/pending/rejected records, duplicate parameters, multiple dates, department/equipment isolation and source category changes.
- [x] Add automatic storage with master snapshots plus readable per-action/per-month detail rows. Preserve previous manual JSON in a backup column. Add new rows idempotently; mark obsolete detail rows inactive rather than delete data.
- [x] Recompute when opening/reloading a book and after approval/catalog writes; use a 15-minute trigger for direct sheet changes. Lock shared writes, avoid unchanged rewrites and preserve other columns.
- [x] Remove month editing/save controls and reject the old manual-save API. Render multiline dates on screen and print.
- [x] Provision additional storage headers/trigger, synchronize actual data, verify retained manual backup, test browser and multi-page PDF, deploy both apps and push Git.
