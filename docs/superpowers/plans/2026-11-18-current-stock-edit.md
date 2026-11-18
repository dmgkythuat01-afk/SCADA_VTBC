# Current stock quantity editing

Add Sửa on each current-stock row. Open a focused dialog showing material, stock ID, lot, unit and current quantity; accept a nonnegative decimal including zero. Authenticate using the existing inventory role, locate exactly one approved usable KhoNguyenLieu.Id under ScriptLock, reject stale expected quantity, and update only khoiLuongNhap. Preserve approval and all other cells. Refresh the changed local row/QR/options without reloading all cards; zero removes the row consistent with the current stock list's existing >0 filter.

Verify exact ID/header mapping, permission/validation, duplicates, stale balances, zero, no unrelated writes, dialog submission and regression suite before deploying.

59 warehouse tests passed, including dialog updates/removal and selected manual-export balance refresh. Independent review found no important issue; the noted stale manual detail display was corrected without resetting the user's selected export unit. Existing stock data was not modified during verification. Canonical remote files verified against local sources; deployed on the existing warehouse URL at version 76.
