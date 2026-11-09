# Asset information update

User requests boPhanQuanLy/ngayLapDat in the desktop asset UI and chiTiet renamed thongSoKyThuat. Keep internal details key compatible and map old/new physical header, reject duplicates. Append managingDepartment/installationDate internal fields, optional validated date, preserve on old-client edits, date-only Sheets reads use Vietnam timezone. Add fields to edit dialog and detail card.

Verification: schema old/new headers, preservation of extra columns, save/edit/clear and invalid dates; desktop composed page. Rename live header only (no cell data rewrite) with before/after row digest, use same shared data. Push/deploy admin and update pinned mobile backend to retain schema compatibility; Git.

Completed: 55 tests pass; Chrome checks verify date/department in detail and edit form plus technical specifications label. Independent review found no substantive issues. Live migration preserved all14 existing data rows, renamed only technical-spec header and retained the two user-added columns. Admin deployments @20, mobile @4 with backend library20; desktop and legacy mobile view render. Temporary migration transport removed, canonical source restored.
