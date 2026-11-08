# Mobile Service Requests Implementation Plan
Execute inline using executing-plans; final independent requesting-code-review.
Spec: ../specs/2026-11-08-mobile-service-design.md

- [x] Add schema/model and failing workflow tests for scope, roles, any technician, ownership, idempotency, rework and schedule timing.
- [x] Implement services, private photo/report drafts, confirmations/reconciliation, in-app notifications and accepted desktop history.
- [x] Build separate MobileIndex/MobileStyles/MobileClient with bottom navigation, cascading machine/component selectors, report/camera/gallery and requester review.
- [x] Add owner-only sample initializer and six role accounts; verify samples and schema preserve existing data.
- [x] Test all backend regressions and desktop/mobile Chrome UI; independent review and fixes.
- [x] Push source, initialize shared Sheets and deploy existing URLs with ?view=mobile at version 17.
- [ ] Commit/push Git and provide login guidance.

Review focus: actor spoofing, cross-request photo access, concurrent drafts, duplicate confirmation, partial writes, schedule changed outside request, immutable prior reports, preservation of current login and existing data.

Verified: 51 Node tests pass. Local Chrome at 390×844 completed whole-machine create → different technician report + image → creator reject → another technician re-report → creator accept; two reports/reviews retained and one desktop history job created. Final review identified unsent draft retention across logout, fixed with regression coverage. Live desktop/mobile pages load. Native physical-phone camera remains to be checked on device.

Shared-sheet initializer added 6 TaiKhoan, 5 PhieuYeuCau, 4 BaoCaoKhacPhuc, 2 XacNhanKhacPhuc and 2 NhatKyThongBao rows. Eight pre-existing sheet rectangles passed preservation checks. Temporary fixed initializer transport removed and canonical source restored; no passwords committed.
