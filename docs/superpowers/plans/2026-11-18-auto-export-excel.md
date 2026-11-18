# Automatic production export history columns

Add Số phiếu (PhieuXuatId) and Kho (IdKho) to the automatic production history table and its Excel export. Preserve approval-date filters, plan filter, allocation display and print data. User selected one Excel row per lot. Excel per-lot quantity is a real numeric cell without lot labels or units. Limit changes to this card and its export-specific projection.

Verify source mapping, single/multiple lots, missing legacy allocations, filtered download, and existing slip regressions before updating the current warehouse deployment.

Excel projection aligns warehouse IDs to lot positions when counts match; otherwise preserves source IDs instead of guessing. Original aggregate Số lượng appears only on the first lot row to prevent duplicate totals; original UI rows and print metadata remain intact. Missing/invalid legacy allocations export a blank per-lot quantity. A shared Excel helper option applies raw numeric cell formatting only to the selected column; all other exports retain existing formatting.

55 warehouse tests passed. Source preflight confirmed the live warehouse project matched the repository baseline before update.

Independent review found no important issue. Warehouse deployment updated to version 74 on its existing URL; canonical remote files verified against local sources. No spreadsheet data was changed by this update.
