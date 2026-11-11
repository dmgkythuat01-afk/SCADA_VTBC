# Preapproval and handover implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Assignment → plan → parallel PGD approval → execution/photo handover → creator confirmation, with all unfinished requests migrated.

**Architecture:** New MobileWorkPreapproval.js owns V2 transitions using existing request/report/review columns and operation ledger. Route existing mobile API actions through stage-aware adapters. Preserve completed legacy records and old handlers for historical tests; migrate every unfinished legacy request to v2_assignment before reconciliation.

**Tech Stack:** Apps Script V8, Google Sheets/Drive, HTML/CSS/JavaScript, Node test runner.

**Spec:** docs/superpowers/specs/2026-11-11-mobile-preapproval-handover-design.md

## Global constraints

- No new columns, public photos, accounts, email sends or changed completed requests.
- Only original assignee assigns; only assigned executor plans/handovers; only creator accepts final handover.
- Both PGDs must approve exact plan before handover; any rejection, including handover rejection, requires a new plan round and both PGDs again.
- Migrate all unfinished legacy states to assignment, preserve report/review/photo history.

## Review focus

- Stale old-client API calls must not bypass stages after migration.
- Failure after ledger/report persistence must reconcile once without duplicate history or notifications.
- Approval order and simultaneous stale screens must work independently by branch.
- Historical draft/photos and old approval signatures must not leak into current round.
- Current completed legacy records and physical sheet headers must remain unchanged.

### Task 1: Domain, migration and guards

Files: new admin/MobileWorkPreapproval.js; adapt MobileWorkWorkflow.js, MobileWorkPhotos.js and MobileWorkBridge.js; tests/mobile-preapproval.test.cjs and fixture.

Interfaces: mobileWorkV2Create_, mobileWorkV2Assign_, mobileWorkV2Start_, mobileWorkV2Save_, mobileWorkV2Submit_, mobileWorkV2Approve_, mobileWorkV2Review_, mobileWorkV2Reconcile_, mobileWorkMigrateOpen_. Persist V2 report stages and decision ledgers in current columns.

- [x] Write/run failing tests for assignment permission, two approval orders, preapproval image rejection, creator-only final confirmation, full reapproval after rejection, migration preservation and interrupted-write recovery.
- [x] Implement isolated V2 module and API routing; preserve legacy suites via explicit legacy fixture mode.
- [x] Run new suite plus existing tests; commit after full integration review.

### Task 2: User interface and printable projection

Files: MobileClient.html; new MobilePreapproval.html; MobileIndex.html; MobileWorkPrint.js.

- [x] Add stage-aware status labels, notifications/pending filters, assignment chooser and split plan/handover forms.
- [x] Keep date defaults, account avatar, responsive menu, private image proxy and combined snapshots.
- [x] Print exact approved plan, handover photos and signatures from matching rounds; never sign receiving at plan submission.
- [x] Browser-test original assignee, executor, two PGDs and creator on mobile and desktop; render PDF at incomplete and complete stages.

### Task 3: Review, live migration, deployment and Git

- [x] Request read-only review; address important findings; run full tests.
- [x] Push canonical backend; run owner-only fixed-purpose migration with shared lock and verify completed records/catalog/report/review data unchanged. Remove temporary endpoint.
- [x] Version backend, pin mobile library, push/deploy both mobile URLs and backend; compare remote sources and deployment versions.
- [x] Push exact source/test/doc files to Git and confirm clean status.

## Evidence

66 Node tests pass. Full browser flow on390px/1440px includes creator rejection followed by two fresh PGD approvals and one final history. PDFs complete and pre-handover each fit one A4 landscape page; long text retained in annex. Read-only review found no substantive issues. Live migration moved2unfinished requests, preserved3completed requests and every report/review/catalogue row; headers unchanged. Temporary migration endpoint removed.
