# Mobile manual stock QR

Add Quét QR nguyên liệu above Mã nguyên liệu on MobileXuatKhoThuCong's Xuất nguyên liệu page. Reuse the existing external scanner URL and returnUrl/lineId → qr/lineId redirect protocol used by the worker app; no embedded camera or scanner rewrite.

On return, use freshly loaded approved stock and match one exact Id to fill code, material name and stock selector, then reuse handleManualIdChange for lot/balance/details. Reject missing or duplicated stock IDs without guessing. Never add a voucher row or submit an export automatically.

Use a random scan nonce bound to an authenticated user's pending state. Preserve the current manual draft, photos and unfinished form in IndexedDB before navigating (avoid localStorage image quota); restore only for the same user within the session's six-hour window. Cancel restores the form, and selecting a different stock clears the old line's quantity/photo to avoid mismatches. Keep draft rows already added intact.

When IndexedDB is blocked, attempt bounded-by-browser-quota localStorage fallback; storage failure stops navigation. A small owner-specific hint authorizes one restore and is consumed before applying QR. Clear pending state on restored original-page interactions to avoid resurrecting an old voucher draft. Keep a normal top-navigation fallback link for browsers that require a new user gesture after asynchronous draft saving.

Render bootstrap data as script-safe JSON, remove consumed QR query parameters, preserve SSO, verify parser/selection/return flow and frontend regressions. Perform no production export writes during QA. Preflight remote sources before updating the existing mobile deployment.

## Verification

- 34 worker-export tests passed; the existing photo template test now supplies current SSO/QR bootstrap values and checks the already-established external-camera mode.
- Browser QA with actual IndexedDB and isolated fake stock passed scan-return selection, lot/balance population, draft/photo retention, cancel, missing stock, consumed pending state, fallback storage and phone/desktop layout.
- Review found and corrected a nested-template bootstrap issue: bootstrap is evaluated only in the root template; included QR HTML contains no scriptlets. A regression test enforces this. Added a second owner/token check after asynchronous pending-state deletion.
- Remote source preflight matched the repository baseline before upload. No production voucher or inventory was modified during QA.
- Published mobile version 10 verified on the existing URL: live source matches local, QR button/module render and bootstrap is evaluated. Existing scanner and camera projects were not changed.
