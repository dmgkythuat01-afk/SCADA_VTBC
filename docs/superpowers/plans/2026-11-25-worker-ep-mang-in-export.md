# Worker film-print container export

> **For agentic workers:** Use superpowers:executing-plans; implement inline with one independent final review.

**Goal:** Add a top card in worker Ép màng in, select PCN plan, scan every assigned container, confirm once to consume full remaining quantities, retain export audit. Later C# printing events must not deduct again.

**Architecture:** Use the existing inventory API as the shared writer for PCN plan changes and worker exports, under the same ScriptLock as C# EpMangIn. Keep reads local to each app. A new worker module preserves scanner state by account+plan+revision and uses existing external QR scanner in the same tab. Container detail snapshots form the export ledger, with immutable parent export state. Existing report card remains, but cancelled and unexported new plans cannot be reported.

**Approved:** Scan all assigned containers then confirm export => remaining inventory zero; C# later does not consume twice. All container quantities, not just the plan target, are exported as in assembly export.

**Tasks**
- [x] Add shared core and authenticated server-only bridges, route PCN mutations to stock API lock. Keep API bearer out of browser/source control; append schema only.
- [x] Export core validates revision, immutable cancellation/export state, exact complete unique scans, reservation ownership and current positive remaining stock. Persist an export intent before inventory writes; recover retry from frozen before/after values; reject unrelated changed balances. Mark every detail then parent exported. Preserve report cells and original C# event schema.
- [x] Add worker card, fetch/scan validation/confirm APIs, same-tab scanner return route, per-user nonce and revision-bound scan storage, keep scans on server failure and clear on successful export. Show progress and history details.
- [x] Guard old report API against cancelled and not-yet-exported new plans; share report writer with plan lock where required.
- [x] Tests: wrong/extra/missing/duplicate scans, cancel/stale plan, inventory change, double submit, partial-write retry, C# after worker no duplicate, PCN edit/export race, account/revision scanner state, compiled page and browser QA.
- [x] Verify remote/external baseline, backup and append live columns, set server-only bridge properties, update API/worker/PCN deployments, verify source/render, review, merge/push Git. If Google requests new external-request authorization for PCN, prepare concrete release before asking user to run its helper.


## Release evidence
- 90 PCN/worker Node tests passed. Full Chrome fixture QA passed wrong/correct QR, nonce replay rejection, scans preserved on reload, complete-scan gating, full per-box audit, restored-tab initialization, stale-account callback isolation and 390/1440 overflow checks. Independent review found no remaining blockers.
- Schema append preserved original values/formulas of KeHoachEpMangIn, ChiTietKeHoachEpMangIn, KetQuaLapVi and EpMangIn. No production export was performed.
- Shared API version 15 deployed. Runtime smoke rejected three deliberately invalid mutation/export/report requests, read 172 stock rows and confirmed original getSheet_/nowText_ helpers available, with data unchanged.
- Active external LuuCanBatch_V2_EpMangIn_9Cot.js synchronized to exact combined API source. Original nine-column event append behavior remains intact. All bearer values stay server-side and are excluded from Git.
- PCN server-only bridge properties configured. Owner granted external-request authorization; a fresh temporary read-only ping confirmed success before release.
- Released on existing URLs: PCN version 40, worker version 42, shared API version 15. Exact deployed source and public HTML render verified for both apps. Temporary setup/probe endpoints are removed; private backups/receipts remain ignored.
