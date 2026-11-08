# DMG Quan ly thiet bi

PWA: https://dmg-quanly-thietbi.web.app
Firebase: https://console.firebase.google.com/project/dmg-quanly-thietbi/overview
Sheets: https://docs.google.com/spreadsheets/d/1GyLKh_9gwPeAzTMuowR3OE8eYnSSnoMPMLnWcUYxpoI/edit
Apps Script: https://script.google.com/d/1n2ecVQFAiRDNFKI6t3gXWxNBqCwtjlOWoploVOcluxowBSxSe_GY_o9T/edit

## Initial Google activation (owner)
1. Firebase console > Authentication > Get started > Sign-in method > Google. Enable, choose support email, Save. Standard Firebase Auth; do not upgrade Identity Platform or enable billing.
2. Apps Script editor > run setupEquipmentApp once and grant Sheets/Drive/mail/trigger permissions. It creates the schemas, private photo folder, initial owner member, owner report email and Monday/Friday 8-9am Vietnam triggers. Re-running replaces only this app's report triggers and preserves records.
3. Sign in to PWA using the same Google email that owns Apps Script. Add other members in Settings. Both an authenticated verified Google account and explicit Members allowlist are required on every API call.
4. Firebase project settings > Cloud Messaging > Web Push certificates > Generate key pair. Copy PUBLIC key into app Settings > Email settings > Web Push public key. Each device clicks Enable notifications. Never publish a private key.
5. If the backend URL returns 403 before step2, run setupEquipmentApp first; Deploy > Manage deployments > edit the existing web app, execute as owner, access Anyone, new version. Update public/config.js bridgeUrl only if a new deployment URL is created.

## Files
- public/: Vietnamese responsive PWA. Static shell cached; private equipment/attachment data never cached offline.
- appscript/: Sheets CRUD, role authorization, jobs, JPEG private Drive attachments, Monday/Friday email and FCM.
- firebase.json: isolated Hosting deployment.

## Data sheets
Assets: workshop > area > machine > component, stable IDs and revision. Archive rather than delete.
Schedules: component work, interval week/month, first/next due date, assignee and checklist.
Jobs: repair/maintenance, opened/assigned/completed, result/checklist and photo metadata.
Members: admin or technician allowlist. Devices: FCM registration tokens.
Notifications: successful and failed deliveries; scheduled send dedup by date/channel/recipient.
Audit: write trail. Settings: report recipients, Web Push public key.

## Rules
Due today and overdue stay red until completion. Next date uses actual completion plus interval; monthly cycles clamp month end. Repair completion does not reset unrelated maintenance schedules. Multiple independent tasks per component. New members added by admin; last admin cannot be removed. Up to12 JPEG photos per job, client resizes to1600px, server max3MB each. Photos are never public. Upload/complete use request IDs; revisions reject stale writes. If a job completion write succeeds but schedule write fails, reconciliation heals the next due date without duplicate history.

## Deploy / verification
From repo root: node --test tests/quan-ly-thiet-bi/*.test.cjs
From QuanLyThietBi: clasp push --force; clasp deploy -i <existing-deployment-id> --description <description>
From QuanLyThietBi: firebase deploy --only hosting --project dmg-quanly-thietbi

## Limits
Initial activation/Google consent needs the account owner. Browser push depends on OS/browser/network and is not guaranteed when browser process is fully stopped. Email is primary reporting channel; Google quotas apply. No billing account enabled. Work completion supports photos; it does not require photos because mandatory attachments were not requested. No offline writes. Google Sheets is suitable for initial team-scale use; daily loads read the register and work history.

## Activation status at handoff (2026-11-08)
- Firebase project/Hosting, web registration, API backend and bound spreadsheet created; Hosting published.
- Firebase API setup of Identity Platform returned BILLING_NOT_ENABLED. Standard Firebase Authentication still needs console Get started/Google provider activation. No billing enabled.
- Backend public URL returns403 until owner authorization; run setupEquipmentApp in editor. Its schema and trigger setup have not been verified live.
- Firebase owner: dmg.hrvp01@gmail.com. Apps Script owner: dmg.pcnviengiat@gmail.com. Initial app admin/report recipient derives from Apps Script effective owner. Sign in with that account first, then add other members.
- FCM requires roles/firebasecloudmessaging.admin on this Firebase project for the Apps Script owner. Automatic approval review rejected the proposed persistent IAM grant (and optional quota-consumer grant); NO IAM changes were executed. Await explicit user authorization. No need for serviceUsageConsumer for normal app use; it was only proposed for optional automated Sheets schema initialization.
- Web Push public key still needs Firebase console generation and entry in app Settings. Emails/FCM cannot be called fully operational before account activation and a real send test.
- Tests: 13 business/security regression tests and local Chrome desktop/mobile UI checks with fixtures. Live shell/SDK/icon/service-worker HTTP200 verified. Fixture data never uploaded to Sheets.
