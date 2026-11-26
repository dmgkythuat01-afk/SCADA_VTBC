using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 
using System.Data;
using System.Data.SqlClient;

namespace CanScadaVienTreoBC.Services
{
    public class SqlDataService
    {
        private readonly string _connectionString;

        public SqlDataService()
        {
            _connectionString = "Data Source=DESKTOP-RV74H3E\\SQLEXPRESS;Initial Catalog=CanScadaVienTreoBC;Integrated Security=True;";
        }

        public DataTable GetApprovedExportTickets()
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string sql = @"
                    SELECT *
                    FROM dbo.PhieuXuatNguyenLieu
                    WHERE trangThaiPheDuyet = N'Đã phê duyệt'
                    ORDER BY NgaySanXuat DESC, PhieuXuatId DESC, STT ASC;
                    ";

                using (SqlDataAdapter da = new SqlDataAdapter(sql, conn))
                {
                    DataTable dt = new DataTable();
                    da.Fill(dt);
                    return dt;
                }
            }
        }

        public DataTable GetApprovedExportTicketsByPlan(string keHoachId)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string sql = @"
                    SELECT *
                    FROM dbo.PhieuXuatNguyenLieu
                    WHERE trangThaiPheDuyet = N'Đã phê duyệt'
                      AND KeHoachId = @KeHoachId
                    ORDER BY STT ASC;
                    ";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@KeHoachId", keHoachId ?? "");

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        DataTable dt = new DataTable();
                        da.Fill(dt);
                        return dt;
                    }
                }
            }
        }

        public DataTable GetApprovedExportPlanList()
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string sql = @"
                    SELECT 
                        KeHoachId,
                        PhieuXuatId,
                        tenBaiLieu,
                        MAX(soLuong) AS soLuong,
                        MAX(NgaySanXuat) AS NgaySanXuat,
                        COUNT(*) AS soDongNguyenLieu
                    FROM dbo.PhieuXuatNguyenLieu
                    WHERE trangThaiPheDuyet = N'Đã phê duyệt'
                    GROUP BY KeHoachId, PhieuXuatId, tenBaiLieu
                    ORDER BY MAX(NgaySanXuat) DESC, PhieuXuatId DESC;
                    ";

                using (SqlDataAdapter da = new SqlDataAdapter(sql, conn))
                {
                    DataTable dt = new DataTable();
                    da.Fill(dt);
                    return dt;
                }
            }
        }

        public DataTable GetRecipeByTenBaiLieu(string tenBaiLieu)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string sql = @"
                    SELECT *
                    FROM dbo.BaiTronLieu
                    WHERE tenBaiLieu = @tenBaiLieu
                    ORDER BY 
                        TRY_CONVERT(INT, STT) ASC,
                        TRY_CONVERT(INT, sttTron) ASC;
                    ";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@tenBaiLieu", tenBaiLieu ?? "");

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        DataTable dt = new DataTable();
                        da.Fill(dt);
                        return dt;
                    }
                }
            }
        }

        public DataTable GetKeHoachSanXuatHomNay()
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string today = DateTime.Now.ToString("yyyy-MM-dd");

                string sql = @"
                    SELECT 
                        PhieuXuatId,
                        KeHoachId,
                        tenBaiLieu,
                        MAX(soLuong) AS soLuong,
                        MAX(NgaySanXuat) AS NgaySanXuat
                    FROM dbo.PhieuXuatNguyenLieu P
                    WHERE 
                        NgaySanXuat = @NgaySanXuat
                        AND trangThaiPheDuyet = N'Đã phê duyệt'
                    GROUP BY 
                        PhieuXuatId,
                        KeHoachId,
                        tenBaiLieu
                    ORDER BY 
                        PhieuXuatId DESC,
                        KeHoachId DESC;
                    ";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@NgaySanXuat", today);

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        DataTable dt = new DataTable();
                        da.Fill(dt);
                        return dt;
                    }
                }
            }
        }

        public DataTable GetKeHoachSanXuatTheoNgay(DateTime ngaySanXuat)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string ngay = ngaySanXuat.ToString("yyyy-MM-dd");

                string sql = @"
                    SELECT 
                        PhieuXuatId,
                        KeHoachId,
                        tenBaiLieu,
                        MAX(soLuong) AS soLuong,
                        MAX(NgaySanXuat) AS NgaySanXuat
                    FROM dbo.PhieuXuatNguyenLieu P
                    WHERE 
                        NgaySanXuat = @NgaySanXuat
                        AND trangThaiPheDuyet = N'Đã phê duyệt'
                    GROUP BY 
                        PhieuXuatId,
                        KeHoachId,
                        tenBaiLieu
                    ORDER BY 
                        PhieuXuatId DESC,
                        KeHoachId DESC;
                    ";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@NgaySanXuat", ngay);

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        DataTable dt = new DataTable();
                        da.Fill(dt);
                        return dt;
                    }
                }
            }
        }

        public DataTable GetNguyenLieuCanTheoPhieuXuat(string phieuXuatId, string tenBaiLieu)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string sql = @"
                    SELECT 
                        P.PhieuXuatId,
                        P.KeHoachId,
                        P.tenBaiLieu,
                        P.soLuong,
                        P.NgaySanXuat,
                        P.STT,
                        P.maNguyenLieu,
                        P.tenNguyenLieu,
                        P.khoiLuongCanXuat,
                        P.donViCanXuat,
                        P.sttTron,
                        P.canSuDung,
                        P.IdKho,
                        P.khoiLuongKho,
                        P.donViKho,
                        P.quyCachDongGoi,
                        P.LotNo,
                        P.ngaySanXuatKho,
                        P.hanSuDung,
                        P.nhaCungCap,
                        P.ngayNhap,
                        P.nguoiTao,
                        P.ngayTao,
                        P.trangThaiPheDuyet,
                        P.cachXuat,
                        P.nguoiPheDuyet,
                        P.thoiGianDuyet,
                        P.IdKhoDaTru,

                        B.khoiLuong AS KhoiLuongBaiTronGoc,
                        B.donVi AS DonViBaiTronGoc,
                        K.khoiLuongMotMe,

                        CASE 
                            WHEN LTRIM(RTRIM(ISNULL(B.donVi, ''))) = N'%' THEN
                                CASE 
                                    WHEN P.canSuDung IN (N'Cân 6kg', N'Cân phân tích') THEN
                                        ROUND(
                                            ISNULL(TRY_CONVERT(decimal(18, 6), B.khoiLuong), 0)
                                            * ISNULL(TRY_CONVERT(decimal(18, 6), K.khoiLuongMotMe), 0)
                                            / 100
                                            * 1000
                                        , 3)
                                    ELSE
                                        ROUND(
                                            ISNULL(TRY_CONVERT(decimal(18, 6), B.khoiLuong), 0)
                                            * ISNULL(TRY_CONVERT(decimal(18, 6), K.khoiLuongMotMe), 0)
                                            / 100
                                        , 3)
                                END
                            ELSE
                                TRY_CONVERT(decimal(18, 6), B.khoiLuong)
                        END AS KhoiLuong,

                        CASE 
                            WHEN LTRIM(RTRIM(ISNULL(B.donVi, ''))) = N'%' THEN
                                CASE 
                                    WHEN P.canSuDung IN (N'Cân 6kg', N'Cân phân tích') THEN N'g'
                                    ELSE N'kg'
                                END
                            ELSE
                                B.donVi
                        END AS DonViBaiTron

                        FROM dbo.PhieuXuatNguyenLieu P
                        LEFT JOIN dbo.BaiTronLieu B
                            ON  B.tenBaiLieu = P.tenBaiLieu
                            AND B.maNguyenLieu = P.maNguyenLieu
                            AND ISNULL(B.STT, '') = ISNULL(P.STT, '')
                        LEFT JOIN dbo.KeHoachSanXuat K
                            ON K.Id = P.KeHoachId
                            AND LTRIM(RTRIM(ISNULL(K.tenNguyenLieu, ''))) =
                                LTRIM(RTRIM(ISNULL(P.tenNguyenLieu, '')))
                            AND LTRIM(RTRIM(ISNULL(K.MaKeToan, ''))) =
                                LTRIM(RTRIM(ISNULL(P.MaKeToan, '')))
                        WHERE  
                        P.PhieuXuatId = @PhieuXuatId
                        AND P.tenBaiLieu = @tenBaiLieu
                        AND P.trangThaiPheDuyet = N'Đã phê duyệt'
                    ORDER BY 
                        TRY_CONVERT(INT, P.sttTron) ASC,
                        TRY_CONVERT(INT, P.STT) ASC;
                    ";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@PhieuXuatId", phieuXuatId ?? "");
                    cmd.Parameters.AddWithValue("@tenBaiLieu", tenBaiLieu ?? "");

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        DataTable dt = new DataTable();
                        da.Fill(dt);
                        return dt;
                    }
                }
            }
        }

        public bool IsKeHoachDaCanBatch(string keHoachId)
        {
            if (string.IsNullOrWhiteSpace(keHoachId))
            {
                return false;
            }

            using (SqlConnection conn = new SqlConnection(_connectionString))
            using (SqlCommand cmd = new SqlCommand(@"
        IF OBJECT_ID(N'dbo.ChiTietCanBatch', N'U') IS NULL
        BEGIN
            SELECT CAST(0 AS bit);
            RETURN;
        END;

        SELECT CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM dbo.ChiTietCanBatch
                    WHERE LTRIM(RTRIM(ISNULL(KeHoachId, ''))) = LTRIM(RTRIM(@KeHoachId))
                )
                THEN CAST(1 AS bit)
                ELSE CAST(0 AS bit)
            END;
        ", conn))
            {
                cmd.Parameters.AddWithValue("@KeHoachId", keHoachId.Trim());

                conn.Open();

                object result = cmd.ExecuteScalar();

                if (result == null || result == DBNull.Value)
                {
                    return false;
                }

                return Convert.ToBoolean(result);
            }
        }

        public string GetLoaiNguyenLieuBaiTronLieu(string tenBaiLieu, string stt, string maNguyenLieu)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string checkColumnSql = @"
            SELECT CASE 
                WHEN COL_LENGTH('dbo.BaiTronLieu', 'loaiNguyenLieu') IS NULL THEN 0 
                ELSE 1 
            END;
        ";

                using (SqlCommand checkCmd = new SqlCommand(checkColumnSql, conn))
                {
                    int hasColumn = Convert.ToInt32(checkCmd.ExecuteScalar());

                    if (hasColumn == 0)
                        return "Thường";
                }

                string sql = @"
            SELECT TOP 1 
                ISNULL(NULLIF(LTRIM(RTRIM(loaiNguyenLieu)), ''), N'Thường') AS loaiNguyenLieu
            FROM dbo.BaiTronLieu
            WHERE LTRIM(RTRIM(tenBaiLieu)) = LTRIM(RTRIM(@tenBaiLieu))
              AND LTRIM(RTRIM(STT)) = LTRIM(RTRIM(@STT))
              AND LTRIM(RTRIM(maNguyenLieu)) = LTRIM(RTRIM(@maNguyenLieu));
        ";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@tenBaiLieu", tenBaiLieu ?? "");
                    cmd.Parameters.AddWithValue("@STT", stt ?? "");
                    cmd.Parameters.AddWithValue("@maNguyenLieu", maNguyenLieu ?? "");

                    object result = cmd.ExecuteScalar();

                    string loai = result == null || result == DBNull.Value
                        ? ""
                        : Convert.ToString(result).Trim();

                    return string.IsNullOrWhiteSpace(loai) ? "Thường" : loai;
                }
            }
        }

        public DataTable GetDaLuuNguyenLieuCan(string phieu, string plan, string recipe, string stt, string material)
        {
            using (var conn = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand(@"IF OBJECT_ID(N'dbo.ChiTietCanBatch', N'U') IS NULL SELECT CAST(NULL AS nvarchar(255)) AS IdBatch, CAST(NULL AS nvarchar(255)) AS SttBatchNL WHERE 1 = 0;
                ELSE SELECT * FROM dbo.ChiTietCanBatch
                WHERE LTRIM(RTRIM(ISNULL(PhieuXuatId,''))) = @phieu
                  AND LTRIM(RTRIM(ISNULL(KeHoachId,''))) = @plan
                  AND LTRIM(RTRIM(ISNULL(tenBaiLieu,''))) = @recipe
                  AND LTRIM(RTRIM(ISNULL(STT,''))) = @stt
                  AND LTRIM(RTRIM(ISNULL(maNguyenLieu,''))) = @material", conn))
            {
                cmd.Parameters.AddWithValue("@phieu", (phieu ?? "").Trim());
                cmd.Parameters.AddWithValue("@plan", (plan ?? "").Trim());
                cmd.Parameters.AddWithValue("@recipe", (recipe ?? "").Trim());
                cmd.Parameters.AddWithValue("@stt", (stt ?? "").Trim());
                cmd.Parameters.AddWithValue("@material", (material ?? "").Trim());
                conn.Open();
                var result = new DataTable();
                using (var reader = cmd.ExecuteReader()) result.Load(reader);
                return result;
            }
        }

        public bool DaLuuChiTietCanBatchTheoLoai(
    string phieuXuatId,
    string keHoachId,
    string tenBaiLieu,
    string loaiNguyenLieu)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string checkTableSql = @"
            SELECT CASE 
                WHEN OBJECT_ID(N'dbo.ChiTietCanBatch', N'U') IS NULL THEN 0 
                ELSE 1 
            END;
        ";

                using (SqlCommand checkTableCmd = new SqlCommand(checkTableSql, conn))
                {
                    int hasTable = Convert.ToInt32(checkTableCmd.ExecuteScalar());

                    if (hasTable == 0)
                        return false;
                }

                string checkColumnSql = @"
            SELECT CASE 
                WHEN COL_LENGTH('dbo.ChiTietCanBatch', 'loaiNguyenLieu') IS NULL THEN 0 
                ELSE 1 
            END;
        ";

                using (SqlCommand checkColCmd = new SqlCommand(checkColumnSql, conn))
                {
                    int hasColumn = Convert.ToInt32(checkColCmd.ExecuteScalar());

                    if (hasColumn == 0)
                        return false;
                }

                string sql = @"
            SELECT COUNT(1)
            FROM dbo.ChiTietCanBatch
            WHERE LTRIM(RTRIM(PhieuXuatId)) = LTRIM(RTRIM(@PhieuXuatId))
              AND LTRIM(RTRIM(KeHoachId)) = LTRIM(RTRIM(@KeHoachId))
              AND LTRIM(RTRIM(tenBaiLieu)) = LTRIM(RTRIM(@tenBaiLieu))
              AND ISNULL(NULLIF(LTRIM(RTRIM(loaiNguyenLieu)), ''), N'Thường') = @loaiNguyenLieu;
        ";

                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@PhieuXuatId", phieuXuatId ?? "");
                    cmd.Parameters.AddWithValue("@KeHoachId", keHoachId ?? "");
                    cmd.Parameters.AddWithValue("@tenBaiLieu", tenBaiLieu ?? "");
                    cmd.Parameters.AddWithValue("@loaiNguyenLieu",
                        string.IsNullOrWhiteSpace(loaiNguyenLieu) ? "Thường" : loaiNguyenLieu.Trim());

                    int count = Convert.ToInt32(cmd.ExecuteScalar());

                    return count > 0;
                }
            }
        }

        public bool IsKeHoachDaCanBatchDayDu(string phieuXuatId, string keHoachId, string tenBaiLieu)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string checkSql = @"
            IF OBJECT_ID(N'dbo.PhieuXuatNguyenLieu', N'U') IS NULL
            BEGIN
                SELECT -1 AS TotalRequired, -1 AS MissingCount;
                RETURN;
            END

            IF OBJECT_ID(N'dbo.ChiTietCanBatch', N'U') IS NULL
            BEGIN
                SELECT 0 AS TotalRequired, 999999 AS MissingCount;
                RETURN;
            END

            ;WITH RequiredRows AS
            (
                SELECT
                    LTRIM(RTRIM(ISNULL(PhieuXuatId, ''))) AS PhieuXuatId,
                    LTRIM(RTRIM(ISNULL(KeHoachId, ''))) AS KeHoachId,
                    LTRIM(RTRIM(ISNULL(tenBaiLieu, ''))) AS tenBaiLieu,
                    LTRIM(RTRIM(ISNULL(STT, ''))) AS STT,
                    LTRIM(RTRIM(ISNULL(maNguyenLieu, ''))) AS maNguyenLieu,
                    LTRIM(RTRIM(ISNULL(tenNguyenLieu, ''))) AS tenNguyenLieu,
                    CAST(
                        CEILING(
                            ISNULL(
                                TRY_CONVERT(decimal(18,4), REPLACE(LTRIM(RTRIM(ISNULL(soLuong, '0'))), ',', '.')),
                                0
                            )
                        ) AS int
                    ) AS SoLuongCan
                FROM dbo.PhieuXuatNguyenLieu
                WHERE LTRIM(RTRIM(ISNULL(PhieuXuatId, ''))) = LTRIM(RTRIM(@PhieuXuatId))
                  AND LTRIM(RTRIM(ISNULL(KeHoachId, ''))) = LTRIM(RTRIM(@KeHoachId))
                  AND LTRIM(RTRIM(ISNULL(tenBaiLieu, ''))) = LTRIM(RTRIM(@tenBaiLieu))
            ),
            DoneRows AS
            (
                SELECT
                    LTRIM(RTRIM(ISNULL(PhieuXuatId, ''))) AS PhieuXuatId,
                    LTRIM(RTRIM(ISNULL(KeHoachId, ''))) AS KeHoachId,
                    LTRIM(RTRIM(ISNULL(tenBaiLieu, ''))) AS tenBaiLieu,
                    LTRIM(RTRIM(ISNULL(STT, ''))) AS STT,
                    LTRIM(RTRIM(ISNULL(maNguyenLieu, ''))) AS maNguyenLieu,
                    LTRIM(RTRIM(ISNULL(tenNguyenLieu, ''))) AS tenNguyenLieu,
                    COUNT(1) AS SoLuongDaCan
                FROM dbo.ChiTietCanBatch
                WHERE LTRIM(RTRIM(ISNULL(PhieuXuatId, ''))) = LTRIM(RTRIM(@PhieuXuatId))
                  AND LTRIM(RTRIM(ISNULL(KeHoachId, ''))) = LTRIM(RTRIM(@KeHoachId))
                  AND LTRIM(RTRIM(ISNULL(tenBaiLieu, ''))) = LTRIM(RTRIM(@tenBaiLieu))
                GROUP BY
                    LTRIM(RTRIM(ISNULL(PhieuXuatId, ''))),
                    LTRIM(RTRIM(ISNULL(KeHoachId, ''))),
                    LTRIM(RTRIM(ISNULL(tenBaiLieu, ''))),
                    LTRIM(RTRIM(ISNULL(STT, ''))),
                    LTRIM(RTRIM(ISNULL(maNguyenLieu, ''))),
                    LTRIM(RTRIM(ISNULL(tenNguyenLieu, '')))
            )
            SELECT
                COUNT(1) AS TotalRequired,
                SUM(
                    CASE 
                        WHEN ISNULL(D.SoLuongDaCan, 0) < R.SoLuongCan THEN 1
                        ELSE 0
                    END
                ) AS MissingCount
            FROM RequiredRows R
            LEFT JOIN DoneRows D
                ON R.PhieuXuatId = D.PhieuXuatId
               AND R.KeHoachId = D.KeHoachId
               AND R.tenBaiLieu = D.tenBaiLieu
               AND R.STT = D.STT
               AND R.maNguyenLieu = D.maNguyenLieu
               AND R.tenNguyenLieu = D.tenNguyenLieu
            WHERE R.SoLuongCan > 0;
        ";

                using (SqlCommand cmd = new SqlCommand(checkSql, conn))
                {
                    cmd.CommandTimeout = 120;

                    cmd.Parameters.AddWithValue("@PhieuXuatId", phieuXuatId ?? "");
                    cmd.Parameters.AddWithValue("@KeHoachId", keHoachId ?? "");
                    cmd.Parameters.AddWithValue("@tenBaiLieu", tenBaiLieu ?? "");

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        if (!reader.Read())
                            return false;

                        int totalRequired = reader["TotalRequired"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["TotalRequired"]);

                        int missingCount = reader["MissingCount"] == DBNull.Value
                            ? totalRequired
                            : Convert.ToInt32(reader["MissingCount"]);

                        if (totalRequired <= 0)
                            return false;

                        return missingCount == 0;
                    }
                }
            }
        }
    }
}
