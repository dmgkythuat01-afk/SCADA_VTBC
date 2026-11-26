using System;
using System.Data;
using System.Data.SqlClient;
using System.Linq;

namespace CanScadaVienTreoBC.Services
{
    public class ChiTietCanBatchService
    {
        private readonly string _connectionString;

        public ChiTietCanBatchService()
        {
            _connectionString = "Data Source=DESKTOP-RV74H3E\\SQLEXPRESS;Initial Catalog=CanScadaVienTreoBC;Integrated Security=True;";
        }

        public int SaveToSqlServer(DataTable dt)
        {
            if (dt == null || dt.Rows.Count == 0)
                throw new Exception("Không có dữ liệu ChiTietCanBatch để lưu SQL Server.");

            EnsureRequiredColumnsInDataTable(dt);

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                using (SqlTransaction tran = conn.BeginTransaction())
                {
                    try
                    {
                        EnsureTable(conn, tran, dt);

                        if (CheckDuplicateBeforeSave(conn, tran, dt))
                        {
                            tran.Commit();
                            return 0;
                        }

                        using (SqlBulkCopy bulk = new SqlBulkCopy(conn, SqlBulkCopyOptions.Default, tran))
                        {
                            bulk.DestinationTableName = "dbo.ChiTietCanBatch";
                            bulk.BatchSize = 1000;
                            bulk.BulkCopyTimeout = 120;

                            foreach (DataColumn col in dt.Columns)
                            {
                                bulk.ColumnMappings.Add(col.ColumnName, col.ColumnName);
                            }

                            bulk.WriteToServer(dt);
                        }

                        tran.Commit();
                        return dt.Rows.Count;
                    }
                    catch
                    {
                        tran.Rollback();
                        throw;
                    }
                }
            }
        }

        private void EnsureRequiredColumnsInDataTable(DataTable dt)
        {
            string[] requiredColumns =
            {
                "PhieuXuatId",
                "KeHoachId",
                "tenBaiLieu",
                "maNguyenLieu",
                "tenNguyenLieu",
                "loaiNguyenLieu"
            };

            foreach (string col in requiredColumns)
            {
                if (!dt.Columns.Contains(col))
                {
                    dt.Columns.Add(col, typeof(string));
                }
            }

            foreach (DataRow row in dt.Rows)
            {
                if (string.IsNullOrWhiteSpace(Convert.ToString(row["loaiNguyenLieu"])))
                    row["loaiNguyenLieu"] = "Thường";
            }
        }

        private bool CheckDuplicateBeforeSave(SqlConnection conn, SqlTransaction tran, DataTable dt)
        {
            DataRow first = dt.Rows[0];
            string[] keys = { "PhieuXuatId", "KeHoachId", "tenBaiLieu", "STT", "maNguyenLieu" };
            foreach (string key in keys)
                if (string.IsNullOrWhiteSpace(Convert.ToString(first[key])) ||
                    dt.AsEnumerable().Any(r => !NguyenLieuCanSave.Same(r, key, Convert.ToString(first[key]))))
                    throw new Exception("Mỗi lần chỉ được lưu một nguyên liệu của một kế hoạch. Thiếu hoặc không khớp: " + key);

            const string sql = @"SELECT * FROM dbo.ChiTietCanBatch WITH (UPDLOCK, HOLDLOCK)
                WHERE LTRIM(RTRIM(ISNULL(PhieuXuatId,''))) = @PhieuXuatId
                  AND LTRIM(RTRIM(ISNULL(KeHoachId,''))) = @KeHoachId
                  AND LTRIM(RTRIM(ISNULL(tenBaiLieu,''))) = @tenBaiLieu
                  AND LTRIM(RTRIM(ISNULL(STT,''))) = @STT
                  AND LTRIM(RTRIM(ISNULL(maNguyenLieu,''))) = @maNguyenLieu";
            using (var cmd = new SqlCommand(sql, conn, tran))
            {
                foreach (string key in keys) cmd.Parameters.AddWithValue("@" + key, Convert.ToString(first[key]).Trim());
                var existing = new DataTable();
                using (var reader = cmd.ExecuteReader()) existing.Load(reader);
                int required;
                decimal quantity;
                if (!dt.Columns.Contains("soLuong") || !decimal.TryParse(Convert.ToString(first["soLuong"]).Replace(',', '.'),
                    System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out quantity) || quantity <= 0)
                    throw new Exception("Số batch kế hoạch không hợp lệ.");
                required = Convert.ToInt32(Math.Floor(quantity));
                bool partial = NguyenLieuCanSave.IsMauMui(Convert.ToString(first["loaiNguyenLieu"]));
                if (dt.AsEnumerable().Any(row => NguyenLieuCanSave.IsMauMui(Convert.ToString(row["loaiNguyenLieu"])) != partial))
                    throw new Exception("Loại nguyên liệu không đồng nhất trong dữ liệu lưu.");
                return NguyenLieuCanSave.GetNewRows(dt, existing, required, partial).Rows.Count == 0;
            }
        }

        private string GetFirstValue(DataTable dt, string columnName)
        {
            if (dt == null || dt.Rows.Count == 0)
                return "";

            if (!dt.Columns.Contains(columnName))
                return "";

            object value = dt.Rows[0][columnName];

            return value == null || value == DBNull.Value
                ? ""
                : Convert.ToString(value).Trim();
        }

        private string GetDistinctOneValue(DataTable dt, string columnName, string defaultValue)
        {
            if (dt == null || !dt.Columns.Contains(columnName))
                return defaultValue;

            var values = dt.AsEnumerable()
                .Select(r => Convert.ToString(r[columnName]).Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (values.Count == 0)
                return defaultValue;

            return values[0];
        }

        private bool HasManyValues(DataTable dt, string columnName)
        {
            if (dt == null || !dt.Columns.Contains(columnName))
                return false;

            int count = dt.AsEnumerable()
                .Select(r => Convert.ToString(r[columnName]).Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count();

            return count > 1;
        }

        private void EnsureTable(SqlConnection conn, SqlTransaction tran, DataTable dt)
        {
            string createSql = @"
                IF OBJECT_ID(N'dbo.ChiTietCanBatch', N'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.ChiTietCanBatch
                    (
                        LocalId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
                    );
                END
                ";
            ExecuteNonQuery(conn, tran, createSql);

            foreach (DataColumn col in dt.Columns)
            {
                string colNameSql = col.ColumnName.Replace("'", "''");
                string colNameBracket = col.ColumnName.Replace("]", "]]");

                string addColumnSql = @"
                    IF COL_LENGTH('dbo.ChiTietCanBatch', '" + colNameSql + @"') IS NULL
                    BEGIN
                        ALTER TABLE dbo.ChiTietCanBatch ADD [" + colNameBracket + @"] NVARCHAR(4000) NULL;
                    END
                    ";
                ExecuteNonQuery(conn, tran, addColumnSql);
            }

            EnsureIndex(conn, tran);
        }

        private void EnsureIndex(SqlConnection conn, SqlTransaction tran)
        {
            string sql = @"
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_ChiTietCanBatch_NhomCan'
                      AND object_id = OBJECT_ID('dbo.ChiTietCanBatch')
                )
                BEGIN
                    CREATE INDEX IX_ChiTietCanBatch_NhomCan
                    ON dbo.ChiTietCanBatch
                    (
                        PhieuXuatId,
                        KeHoachId,
                        tenBaiLieu,
                        loaiNguyenLieu
                    );
                END
            ";

            ExecuteNonQuery(conn, tran, sql);
        }

        private void ExecuteNonQuery(SqlConnection conn, SqlTransaction tran, string sql)
        {
            using (SqlCommand cmd = new SqlCommand(sql, conn, tran))
            {
                cmd.CommandTimeout = 120;
                cmd.ExecuteNonQuery();
            }
        }
    }
}
