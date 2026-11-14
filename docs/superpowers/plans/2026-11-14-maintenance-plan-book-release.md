# Sổ kế hoạch bảo dưỡng

- Mobile: Bảo dưỡng → Sổ KHBD. Filter year, workshop and Cơ khí/Điện; click Tải sổ.
- All 93 catalog devices appear under their six machine/line groups, including devices with no matching plan categories.
- DanhMucSoKH supplies category rows and independent tanSuatThayMoi / tanSuatBaoDuong. Seeded 27 unique categories from DanhMucCanKiemTra on 14/11/2026, both frequencies intentionally blank.
- Month text is manual only. Technical/admin roles may edit and Lưu sổ; other authenticated accounts may view/print.
- SoKeHoachBaoDuong stores one versioned row per year/workshop/department. JSON month values retain orphaned keys when catalog changes. Conflicting edits reject instead of overwriting. Maximum 200 characters per month cell and 45,000 serialized characters per book.
- In/Xuất PDF uses current visible content, including unsaved edits, A4 landscape, repeated month headings and footer. It does not mark actual work complete.
- Existing actual maintenance, reviewer and repair flows remain separate.

Validation: 99 Node tests, browser checks at 320/390/768/1440/1920px, month save/reload, three-page print PDF with repeated headings/footer, source seed preserving all prior sheet data. Backend v76; mobile v52.
