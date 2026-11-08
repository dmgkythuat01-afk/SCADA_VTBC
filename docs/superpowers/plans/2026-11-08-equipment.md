# Equipment Implementation Plan
Execute inline using executing-plans.
Spec: ../specs/2026-11-08-equipment-design.md
Goal: independent Firebase PWA + Sheets equipment and maintenance system.
- [ ] Test calendar arithmetic, overdue/14-day rules, authorization, completion idempotence.
- [ ] Build Sheets schema/auth/CRUD and jobs, private photos, email/FCM.
- [ ] Build Vietnamese responsive PWA dashboard, hierarchy, details, schedules, repairs, completion/history, settings.
- [ ] Create separate Firebase/Apps Script resources; configure and deploy where authorized credentials permit.
- [ ] Verify tests and browser, document any account activation remaining; push Git.
Review: month ends/leap years, unauthorized users, replay completion, photo size, failed sends, wrong bridge origin.

Execution ledger:
- Completed code: schema/CRUD, Google token+member authorization, hierarchy, schedules, jobs, actual-completion calendar, private multiple photos, audit, MonFri reports/FCM, PWA shell/config.
- Verified 13 tests, including reviewer-discovered open/completion request replay regression (red then green). Local Chrome fixture tests cover desktop/mobile layouts and routes/checklists/multi-photo input; published static resources HTTP200.
- Created Firebase dmg-quanly-thietbi and bound Apps Script/Sheet. No old app files changed.
- Pending owner actions: Firebase Google Auth Get started; Apps Script setupEquipmentApp consent; generate Web Push public key. Backend403/auth configuration means no live end-to-end claim.
- IAM send role for backend owner was rejected by automatic approval review; no IAM modification executed, explicit user authorization required. Optional quota-consumer grant not necessary for application; do not retry without approval.
