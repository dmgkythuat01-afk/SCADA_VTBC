# Plan-based maintenance and replacement alerts

Cần bảo dưỡng retains one catalog filter above two stacked cards, Bảo dưỡng and Thay mới. Each has separate overdue/today/next-14-day counters, machine groups that can expand to show device/category details, last completion date, applicable plan frequency and next due date. Missing date/frequency items are grouped separately; later dates remain available with a status filter.

Only DanhMucSoKH defines the applicable action/frequency. Latest actual dates merge saved automatic SoKeHoachBaoDuong detail/master values with assessed details from Hoàn thành PhieuBaoDuong records. Work types remain independent, accent-sensitive entity matching is preserved and invalid/future/pending dates are excluded. Exact full installation date is the first-run fallback approved by the user; month/year-only text does not invent a day. Calendar months/years clamp at month end; day14 is included. Overdue stays overdue until a new actual completion.

Projection runs on opening/reloading the tab, reusing the already loaded PBD rows. It writes no data and adds no schedules. Creating a record from a plan alert opens the existing creation flow without applying the old parameter-due-only filter.

Validation: 127 tests, focused review, browser shared filters/independent counters/create action and 320–1920px layouts. Live read-only check: 52 items; two MK-1.1 maintenance categories last 12/11/2026 and next 12/12/2026; 50 items lack an exact initial date. Computation 2219ms in that run, all sheet digests unchanged, zero periodic KHBD triggers. Backend v91/mobile v61.
