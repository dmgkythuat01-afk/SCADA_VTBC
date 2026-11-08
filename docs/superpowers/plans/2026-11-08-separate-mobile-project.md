# Separate mobile Apps Script project

User correction: mobile must be a distinct Apps Script project and web app, while DMG Quan ly thiet bi remains the administrative desktop app. Keep the existing shared Google Sheet, accounts, photos and workflow samples.

Implementation: create MobileQuanLyThietBi with its own HTML/CSS/client, doGet and three narrow RPC wrappers. Use the versioned equipment backend as an Apps Script library so locks, sessions and private Drive configuration remain in one backend. No duplicated independent writers or photo folder. Mobile opens directly at /exec. Admin mobile links point to the new app. Preserve all existing data and role workflow.

Checks: wrapper delegation and snapshot desktop link tests; all existing 51 tests; live project/deployment and mobile page; library authorization must be verified or reported explicitly. Push source and Git, supply new script editor and web app URLs.

Implemented: separate script 1pslo6vQfhFAZlB_jVzjZQsrTgvdAMIZ4yS4emcVZW7eqqQziWhzBu3LQ, mobile deployment version 2, admin deployment version 18. All 53 tests pass. Mobile deployment metadata confirms ANYONE_ANONYMOUS/USER_DEPLOYING. Anonymous live check currently returns Google Drive 403 access denied; owner must run capQuyenMobile in the new editor and approve Sheets/Drive access. Do not claim live mobile login is verified until that step and a fresh check. Existing sheet samples/passwords unchanged.
