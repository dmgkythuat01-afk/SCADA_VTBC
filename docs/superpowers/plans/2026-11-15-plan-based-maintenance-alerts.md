# Plan-based maintenance and replacement alerts

**Goal:** Keep the catalog filters above two separate cards, Bảo dưỡng and Thay mới, showing overdue, due today and due within the next 14 days by workshop/machine/equipment/category.

**Sources:** DanhMucSoKH determines applicable actions and their independent frequencies. Use the latest actual completion date from persisted SoKeHoachBaoDuong dates and completed PhieuBaoDuong assessed details, matched with accent-preserving identities. Pending/rejected/draft records never count. Do not reuse parameter frequency as a plan frequency.

**Initial-date policy:** User confirmed: fall back to the exact full installation date before the first completion. Incomplete month/year installation text must not be silently converted to a day.

- [x] Add a separate read-only backend projection for plan items, calendar day/week/month/year recurrence and inclusive 14-day statuses.
- [x] Add two stacked responsive cards with independent counts, machine groups, last date/frequency/next date, and missing-config sections. Keep one cascading filter card at the top.
- [x] Preserve creation/history/book tabs and keep computation on demand only, without periodic triggers or book writes.
- [x] Test type/date/source isolation, month-end/leap-year boundaries, future/pending records and UI filtering; deploy backend/mobile and push Git.
