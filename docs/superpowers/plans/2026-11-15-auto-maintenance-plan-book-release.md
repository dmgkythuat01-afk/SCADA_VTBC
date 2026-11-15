# Automatic KHBD release

Sổ KHBD is now read-only and automatically derived from PhieuBaoDuong records with trangThai=Hoàn thành. Only saved assessed details participate. Classification uses only loai=Bảo dưỡng / Thay mới, irrespective of parameter name or whether the assessment is positive/negative. Dates come from ngayThucHien, are matched by workshop/machine/device/category/department with accent-preserving identities, and are deduplicated/sorted into month columns as dd/MM/yyyy on separate lines.

SoKeHoachBaoDuong retains master snapshots and gains readable per-action detail rows with thang1–thang12, plus rows for devices without categories. New catalog data adds rows automatically; obsolete details are retained as inactive. Existing manual JSON is copied to duLieuThuCongCu before automatic replacement. No manual save API is accepted. Only owned storage columns are written, preserving unrelated formulas and formatting.

Synchronization runs when opening/reloading a book, after completion acceptance, after relevant admin catalog writes, and from the private 15-minute trigger dongBoSoKeHoachBaoDuongTuDong_. An unchanged run writes nothing. Unknown legacy work types produce a warning rather than infer an action.

Live provision created 234 storage rows (2 master + 232 detail), verified a second run added/updated zero rows, and verified every other sheet unchanged. Current live data has one completed record: 12/11/2026 appears in Bảo dưỡng for MK-1.1 / Trục khấy and Cánh khuấy. Pending records are excluded.

Validation: 118 tests, focused review and identity/formula-preservation regressions, responsive read-only UI, multiline date PDF, per-page stamp and full-width closing borders. Backend v87, mobile v59. Temporary initializer removed; original manual storage had no existing saved rows at provision time.
