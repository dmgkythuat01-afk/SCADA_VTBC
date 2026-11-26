import sqlite3
from pathlib import Path
source = Path('CanScadaVienTreoBC/Services/SqlDataService.cs').read_text(encoding='utf-8-sig')
for method in ('GetKeHoachSanXuatHomNay()', 'GetKeHoachSanXuatTheoNgay(DateTime ngaySanXuat)'):
    body = source.split('public DataTable ' + method, 1)[1]
    query = body.split('string sql = @"', 1)[1].split('";', 1)[0].replace("N'", "'")
    db = sqlite3.connect(':memory:')
    db.execute("ATTACH DATABASE ':memory:' AS dbo")
    db.execute('CREATE TABLE dbo.PhieuXuatNguyenLieu (PhieuXuatId TEXT, KeHoachId TEXT, tenBaiLieu TEXT, soLuong TEXT, NgaySanXuat TEXT, trangThaiPheDuyet TEXT)')
    db.execute('CREATE TABLE dbo.KeHoachSanXuat (Id TEXT, trangThai TEXT)')
    for plan, approval in [('ACTIVE','Đã phê duyệt'), ('CANCELLED','Hủy kế hoạch'), ('MISSING','Đã phê duyệt'), ('UNAPPROVED','Chờ phê duyệt')]:
        db.execute('INSERT INTO dbo.PhieuXuatNguyenLieu VALUES (?, ?, ?, ?, ?, ?)', ('PX'+plan,plan,'Bài liệu','3','2026-11-02',approval))
    db.executemany('INSERT INTO dbo.KeHoachSanXuat VALUES (?, ?)', [('ACTIVE','Hoạt động'),('ACTIVE','Hoạt động'),('CANCELLED','Hủy kế hoạch'),('CANCELLED','Hủy kế hoạch'),('UNAPPROVED','Hoạt động')])
    rows = db.execute(query, {'NgaySanXuat':'2026-11-02'}).fetchall()
    assert len(rows) == 2 and {row[1] for row in rows} == {'ACTIVE', 'MISSING'}, (method, rows)
    print('PASS:', method, '- approved exports only; cancelled excluded; missing plan status does not hide approved exports')
