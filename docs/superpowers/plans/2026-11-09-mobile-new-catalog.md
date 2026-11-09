# Mobile rebuild against current equipment schema

User authorizes replacement of old mobile code, preserving old roles/bottom menus/workflow. Current source uses obsolete library20 and asset hierarchy. New mobile retains separate project/link, uses a new pinned version of shared admin backend so all operations share one script lock and database. No account/sample creation, no edits to6catalog or4admin maintenance sheets at initialization.

Add MobileWorkAuth/Store/Workflow/Photos/Bridge modules in admin backend; replace active mobile frontend connection and adapt selectors directly Xưởng→Máy→Thiết bị (device optional). Map current TaiKhoan username/password/chucVu/maNhanVien/hoTen/email. Requesters TruongCa/CongNhan/PhongCongNghe; technical KyThuat/CoKhi/TuDongHoa may see/claim/report any request; admin supports both. Only creator accepts or requests rework, preserve immutable sent reports/reviews, actual reporting user and multiple private photos.

New4sheets: PhieuYeuCau, BaoCaoKhacPhuc, XacNhanKhacPhuc, ThongBaoMobile. No mail triggers added. Accepted device work appends exactly one immutable admin maintenance/repair history (actual date/checklist/photo snapshots), which drives current calendar; machine-only history has empty device code and cannot shift individual device deadlines. Pending/rejected work never advances schedule. Fresh current criteria captured in report draft; actual results required on maintenance submission. Private draft photos, request/report/review idempotency, revisions and reconciliation preserved. Minimal admin hooks for reconciliation/read and catalog identity guards; original data-entry UI/API unchanged.

Checks: roles/ownership/new catalogue links, machine-only, checklist changes, concurrent drafts, partial writes/replay, actor scoped photos, accepted admin history exactly once, no premature schedule update; admin regressions and Chrome mobile create→unassigned technician/photo→reject→another technician→accept. Live initializer preserves all existing sheet cell digests, adds only4tables, no samples/password changes. Deploy backend/admin/mobile, verify actual snapshots and push Git.

## Verification and release

- 29 Node tests pass across current admin and mobile modules, including header-reordered mobile storage and preservation of extra cells.
- Chrome at390px completed repair request, unrelated technician report with private photo, rejection, second technician report and creator acceptance. Also completed device maintenance with actual checklist results and verified accepted admin history. No uncaught browser errors or horizontal page overflow.
- Live setup created only the four mobile tables and verified all ten original sheet cell digests unchanged. All seven current roles authenticated and read1workshop,6machines,3devices. No sample requests/accounts or email sent. Existing two maintenance report triggers retained.
- Current shared backend/admin version41; mobile version5 pins library41 with developmentModefalse. Both existing mobile deployment URLs updated without changing their IDs. One-use setup/diagnostic deployments are removed after use and canonical source restored.
