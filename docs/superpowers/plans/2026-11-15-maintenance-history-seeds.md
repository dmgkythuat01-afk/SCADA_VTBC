# Historical maintenance dates

Use DanhMucSoKH.ngayBaoDuongGanNhat and ngayThayMoiGanNhat as action-specific fallback after actual completed-record/book history and before installation date. Seed only each exact historical date into its own year/month in the automatic book. A completed record in that same action/month takes precedence. Preserve provenance to avoid mistaking seeded dates for actual book events.

Expose optional date inputs in the admin catalogue. Update books on catalogue save, completed maintenance, or edits to the two source date columns through a spreadsheet edit event; no periodic trigger. Opening books stays read-only.

Verify date parsing, action/identity isolation, cross-year seeding, same-month precedence, source provenance, idempotence, all regression tests, deployed sources, and live schema without inventing production dates.

## Verification

- 142 Node tests passed, including history seeds and provenance regression cases.
- Browser checked optional date fields, catalogue CRUD, batch input and responsive layout.
- Live provision added only two provenance columns to SoKeHoachBaoDuong; other sheet digests unchanged. Second synchronization performed zero writes.
- Installed a spreadsheet edit event for the two historical date columns, no periodic trigger.
- Backend version 93 and both mobile deployments version 62 verified against local canonical sources.
- Source historical dates currently blank; no sample historical dates were written to production.
