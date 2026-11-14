# Sổ kế hoạch bảo dưỡng

- Mobile: Bảo dưỡng → Sổ KHBD. Filter year, workshop and Cơ khí/Điện; click Tải sổ.
- All 93 catalog devices appear under their six machine/line groups, including devices with no matching plan categories.
- DanhMucSoKH supplies category rows and independent tanSuatThayMoi / tanSuatBaoDuong. Seeded 27 unique categories from DanhMucCanKiemTra on 14/11/2026, both frequencies intentionally blank.
- Month text is manual only. Technical/admin roles may edit and Lưu sổ; other authenticated accounts may view/print.
- SoKeHoachBaoDuong stores one versioned row per year/workshop/department. JSON month values retain orphaned keys when catalog changes. Conflicting edits reject instead of overwriting. Maximum 200 characters per month cell and 45,000 serialized characters per book.
- In/Xuất PDF uses current visible content, including unsaved edits, A4 landscape, repeated month headings and footer. It does not mark actual work complete.
- Existing actual maintenance, reviewer and repair flows remain separate.

Validation: 99 Node tests, browser checks at 320/390/768/1440/1920px, month save/reload, three-page print PDF with repeated headings/footer, source seed preserving all prior sheet data. Backend v76; mobile v52.


## Per-line books update

Each machine/production-line is a separate visible/printed book. Filter Xưởng → Dây chuyền (or all) → department. All prints start each line on a new page, restart equipment STT at 1, and append XÁC NHẬN plus unsigned NGƯỜI LẬP / BAN GIÁM ĐỐC sections. STT is centered. Switching the line filter preserves unsaved edits; existing month storage remains compatible and keyed by device/category, without migrating or overwriting saved data. Backend v77; mobile v54. Validation: 100 tests and responsive browser/4-page print checks.


## Hierarchical STT and action selection

STT now uses equipment number 1, 2, etc., with category numbers 1.1, 1.2, etc. Category STT/name span only its one or two action rows. DanhMucSoKH.loaiSoKHDB selects Cả 2 / Bảo dưỡng / Thay mới, validated against ThamSoHeThong.loaiSoKHDB. Blank legacy values retain both actions. Action keys remain stable; changing type hides unwanted rows but preserves their saved month data for re-enabling later. No sheet data changed by this release. Backend v78/mobile v58; 103 tests passed, responsive browser and multi-page PDF border/stamp checks passed.
