# Warehouse material catalogue

Add Nguyên liệu immediately before Tồn kho hiện tại, managing only NguyenLieu. Read physical header order and label fields in Vietnamese. Lazy-load on first open. Provide local keyword/type/manufacturer/supplier/status filters, reset, pagination, reload, Excel download of all filtered rows, and add/edit/delete dialogs.

Use current inventory-role authentication. Under ScriptLock validate physical row + header/value version before update/delete, and reject duplicate material code/accounting code/manufacturer combinations while allowing multiple accounting/manufacturer variants per material. Require material code and name; validate numeric fields when supplied. Write changed cells only, preserve unknown columns/formulas and historical inventory/vouchers; preserve MaKeToan as text. Existing unused nhaCungCap2/3 columns remain preserved but hidden following the established UI preference.

After successful catalogue writes refresh active material lookup used by inbound forms without reloading unrelated cards. Destructive row deletion requires explicit confirmation in the UI. Test authorization, stale rows, duplicate variants, numeric/code preservation, filters/paging/export/CRUD and regression suite. Verify remote source baseline before deployment; never write sample production rows during QA.

## Verification

- 62 warehouse tests passed. Independent code review found no important issue.
- Browser QA with isolated fake data passed menu order, local filters, 50-row pagination, add/edit/delete, Excel, active lookup refresh and mobile/desktop dialog layout.
- Live read-only verification found 277 rows with the expected 17 columns, no duplicate composite keys and no invalid configured numeric values. HTML template rendered successfully; no production catalogue rows were changed.
- Live source matched the repository baseline before upload. Temporary read-only verification code/deployment was removed and canonical source restored.
- Warehouse version 78 deployed on the existing URL; remote sources verified against local canonical files.
