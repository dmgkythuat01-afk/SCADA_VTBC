# KHBD synchronization without a periodic schedule

User removed the 15-minute polling requirement to conserve free Apps Script quota. The KHBD timer/installer is removed, and the specific installed dongBoSoKeHoachBaoDuongTuDong_ trigger is deleted without touching other schedules. Opening or reloading a book now reads only saved SoKeHoachBaoDuong values and current catalog structure; it does not read PBD or perform writes.

Completed-record acceptance still updates the corresponding book immediately. If synchronization fails after accepting the record, the error is surfaced and the same confirmation operation can retry sync without confirming/writing the record twice. Relevant admin catalog changes still refresh book rows per the prior requirement. Direct edits to Sheets no longer cause periodic work.

Backend v89/mobile v60. Verification includes zero remaining KHBD timers, other schedules preserved, storage digest unchanged by cleanup/view and no PBD reads when viewing a book.
