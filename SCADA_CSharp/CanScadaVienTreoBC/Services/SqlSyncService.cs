using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using Newtonsoft.Json.Linq;
using CanScadaVienTreoBC.Models;

namespace CanScadaVienTreoBC.Services
{
    public class SqlSyncService
    {
        private readonly string _connectionString;

        public SqlSyncService()
        {
            _connectionString = "Data Source=DESKTOP-RV74H3E\\SQLEXPRESS;Initial Catalog=CanScadaVienTreoBC;Integrated Security=True;";
        }

        public SyncResult SyncAllData(JObject allData)
        {
            SyncResult result = new SyncResult();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                using (SqlTransaction tran = conn.BeginTransaction())
                {
                    try
                    {
                        EnsureSyncLogTable(conn, tran);

                        foreach (SheetSyncConfig config in GetConfigs())
                        {
                            JArray rows = allData[config.ApiName] as JArray;

                            if (rows == null)
                            {
                                result.Logs.Add("Không có dữ liệu sheet: " + config.ApiName);
                                continue;
                            }

                            EnsureTable(conn, tran, config);

                            int affected = UpsertSheet(conn, tran, config, rows);

                            result.TotalUpdated += affected;
                            result.Logs.Add(config.TableName + ": đồng bộ " + rows.Count + " dòng.");
                        }

                        InsertSyncLog(conn, tran, "getAllData", "OK", result.TotalUpdated, "");

                        tran.Commit();
                    }
                    catch (Exception ex)
                    {
                        tran.Rollback();

                        using (SqlConnection logConn = new SqlConnection(_connectionString))
                        {
                            logConn.Open();
                            InsertSyncLogWithoutTran(logConn, "getAllData", "ERROR", 0, ex.Message);
                        }

                        throw;
                    }
                }
            }

            return result;
        }

        private List<SheetSyncConfig> GetConfigs()
        {
            return new List<SheetSyncConfig>
            {
                new SheetSyncConfig
                {
                    ApiName = "Account",
                    TableName = "Account",
                    KeyColumns = new[] { "useName" },
                    Columns = new[]
                    {
                        "useName", "passWord", "role", "department"
                    }
                },

                new SheetSyncConfig
                {
                    ApiName = "PhieuXuatNguyenLieu",
                    TableName = "PhieuXuatNguyenLieu",
                    KeyColumns = new[] { "PhieuXuatId", "STT", "IdKho" },
                    Columns = new[]
                    {
                        "PhieuXuatId", "KeHoachId", "tenBaiLieu", "soLuong", "NgaySanXuat",
                        "STT", "maNguyenLieu", "tenNguyenLieu", "khoiLuongCanXuat", "donViCanXuat",
                        "sttTron", "canSuDung", "IdKho", "khoiLuongKho", "donViKho",
                        "quyCachDongGoi", "LotNo", "ngaySanXuatKho", "hanSuDung", "nhaCungCap",
                        "ngayNhap", "nguoiTao", "ngayTao", "trangThaiPheDuyet", "cachXuat",
                        "nguoiPheDuyet", "thoiGianDuyet", "IdKhoDaTru", "khoiLuongXuatThucTe", "MaKeToan"
                    }
                },

                new SheetSyncConfig
                {
                    ApiName = "BaiTronLieu",
                    TableName = "BaiTronLieu",
                    KeyColumns = new[] { "Id", "STT", "maNguyenLieu" },
                    Columns = new[]
                    {
                        "Id", "tenBaiLieu", "STT", "maNguyenLieu", "tenNguyenLieu",
                        "khoiLuong", "donVi", "sttTron", "canSuDung", "loaiNguyenLieu"
                    }
                },

                /*
                new SheetSyncConfig
                {
                    ApiName = "NguyenLieu",
                    TableName = "NguyenLieu",
                    KeyColumns = new[] { "maNguyenLieu" },
                    Columns = new[]
                    {
                        "maNguyenLieu", "tenNguyenLieu"
                    }
                },*/

                new SheetSyncConfig
                {
                    ApiName = "KeHoachSanXuat",
                    TableName = "KeHoachSanXuat",

                    // Một kế hoạch hiện có nhiều dòng nguyên liệu.
                    // Id không còn là khóa duy nhất.
                    KeyColumns = new[]
                    {
                        "Id",
                        "tenNguyenLieu",
                        "MaKeToan"
                    },

                    Columns = new[]
                    {
                        "Id",
                        "tenBaiLieu",
                        "soLuong",
                        "NgaySanXuat",
                        "nguoiTao",
                        "ngayTao",
                        "khoiLuongMotMe",
                        "trangThai",
                        "daHoanKhoKhiHuy",
                        "tenNguyenLieu",
                        "MaKeToan"
                    }
                },

                new SheetSyncConfig
                {
                    ApiName = "KhoNguyenLieu",
                    TableName = "KhoNguyenLieu",
                    KeyColumns = new[] { "Id" },
                    Columns = new[]
                    {
                        "Id", "maNguyenLieu", "tenNguyenLieu", "khoiLuongNhap", "donVi",
                        "quyCachDongGoi", "LotNo", "ngaySanXuat", "hanSuDung", "nhaCungCap",
                        "ngayNhap", "trangThai", "nguoiPheDuyetChatLuong", "ngayPheDuyet"
                    }
                },

                new SheetSyncConfig
                {
                    ApiName = "DonHangNhapKho",
                    TableName = "DonHangNhapKho",
                    KeyColumns = new[] { "DonHangId", "IdKho" },
                    Columns = new[]
                    {
                        "DonHangId", "IdKho", "maNguyenLieu", "tenNguyenLieu", "khoiLuongNhap",
                        "donVi", "quyCachDongGoi", "LotNo", "ngaySanXuat", "hanSuDung",
                        "nhaCungCap", "ngayNhap", "ngayTaoDon", "nguoiTao", "trangThaiPheDuyet"
                    }
                }
            };
        }

        private void EnsureTable(SqlConnection conn, SqlTransaction tran, SheetSyncConfig config)
        {
            string sql = @"
                IF OBJECT_ID(N'dbo." + config.TableName + @"', N'U') IS NULL
                BEGIN
                    CREATE TABLE dbo." + config.TableName + @"
                    (
                        LocalId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        " + string.Join("," + Environment.NewLine + "        ", config.Columns.Select(c => "[" + c + "] NVARCHAR(4000) NULL")) + @",
                        LastSyncAt DATETIME NOT NULL DEFAULT GETDATE()
                    );
                END
                ";

            ExecuteNonQuery(conn, tran, sql);

            foreach (string col in config.Columns)
            {
                string addColSql = @"
                    IF COL_LENGTH('dbo." + config.TableName + @"', '" + col.Replace("'", "''") + @"') IS NULL
                    BEGIN
                        ALTER TABLE dbo." + config.TableName + @" ADD [" + col + @"] NVARCHAR(4000) NULL;
                    END
                    ";
                ExecuteNonQuery(conn, tran, addColSql);
            }

            string addSyncSql = @"
                IF COL_LENGTH('dbo." + config.TableName + @"', 'LastSyncAt') IS NULL
                BEGIN
                    ALTER TABLE dbo." + config.TableName + @" ADD LastSyncAt DATETIME NOT NULL DEFAULT GETDATE();
                END
                ";
            ExecuteNonQuery(conn, tran, addSyncSql);
        }

        private int UpsertSheet(SqlConnection conn, SqlTransaction tran, SheetSyncConfig config, JArray rows)
        {
            if (rows.Count == 0) return 0;

            // ======================================================
            // KIỂM TRA KEY TRÙNG TRONG DỮ LIỆU NGUỒN
            // Tránh lỗi SQL MERGE:
            // "attempted to UPDATE or DELETE the same row more than once"
            // ======================================================
            CheckDuplicateKeys(config, rows);

            string tempTable = "#Tmp_" + config.TableName + "_" + Guid.NewGuid().ToString("N");

            string createTempSql = @"
                CREATE TABLE " + tempTable + @"
                (
                    " + string.Join("," + Environment.NewLine + "    ", config.Columns.Select(c => "[" + c + "] NVARCHAR(4000) NULL")) + @"
                );
                ";
            ExecuteNonQuery(conn, tran, createTempSql);

            DataTable dt = BuildDataTable(config, rows);

            using (SqlBulkCopy bulk = new SqlBulkCopy(conn, SqlBulkCopyOptions.Default, tran))
            {
                bulk.DestinationTableName = tempTable;
                bulk.BatchSize = 1000;
                bulk.BulkCopyTimeout = 120;

                foreach (string col in config.Columns)
                {
                    bulk.ColumnMappings.Add(col, col);
                }

                bulk.WriteToServer(dt);
            }

            string onClause = string.Join(" AND ", config.KeyColumns.Select(c =>
                "ISNULL(T.[" + c + "], '') = ISNULL(S.[" + c + "], '')"
            ));

            string updateColumns = string.Join("," + Environment.NewLine + "        ",
                config.Columns
                    .Where(c => !config.KeyColumns.Contains(c))
                    .Select(c => "T.[" + c + "] = S.[" + c + "]")
            );

            if (!string.IsNullOrWhiteSpace(updateColumns))
            {
                updateColumns += "," + Environment.NewLine + "        ";
            }

            updateColumns += "T.LastSyncAt = GETDATE()";

            string insertColumns = string.Join(", ", config.Columns.Select(c => "[" + c + "]")) + ", LastSyncAt";
            string insertValues = string.Join(", ", config.Columns.Select(c => "S.[" + c + "]")) + ", GETDATE()";

            string mergeSql = @"
                MERGE dbo." + config.TableName + @" AS T
                USING " + tempTable + @" AS S
                ON " + onClause + @"
                WHEN MATCHED THEN
                    UPDATE SET
                        " + updateColumns + @"
                WHEN NOT MATCHED BY TARGET THEN
                    INSERT (" + insertColumns + @")
                    VALUES (" + insertValues + @");
                ";

            int affected = ExecuteNonQuery(conn, tran, mergeSql);

            ExecuteNonQuery(conn, tran, "DROP TABLE " + tempTable + ";");

            return rows.Count;
        }

        private DataTable BuildDataTable(SheetSyncConfig config, JArray rows)
        {
            DataTable dt = new DataTable();

            foreach (string col in config.Columns)
            {
                dt.Columns.Add(col, typeof(string));
            }

            foreach (JToken row in rows)
            {
                DataRow dr = dt.NewRow();

                foreach (string col in config.Columns)
                {
                    JToken value = row[col];

                    string text = value == null || value.Type == JTokenType.Null
                        ? ""
                        : value.ToString();

                    if (text.Length > 4000)
                    {
                        text = text.Substring(0, 4000);
                    }

                    dr[col] = text;
                }

                dt.Rows.Add(dr);
            }

            return dt;
        }

        private void CheckDuplicateKeys(
    SheetSyncConfig config,
    JArray rows)
        {
            if (config == null ||
                config.KeyColumns == null ||
                config.KeyColumns.Length == 0 ||
                rows == null ||
                rows.Count == 0)
            {
                return;
            }

            var duplicateGroups = rows
                .Select((row, index) => new
                {
                    RowNumber = index + 2, // +2 vì dòng 1 là header Google Sheet

            Key = string.Join(
                        " || ",
                        config.KeyColumns.Select(col =>
                        {
                            JToken value = row[col];

                            if (value == null ||
                                value.Type == JTokenType.Null)
                            {
                                return "";
                            }

                            return value.ToString().Trim();
                        })
                    )
                })
                .GroupBy(x => x.Key)
                .Where(g => g.Count() > 1)
                .ToList();

            if (duplicateGroups.Count == 0)
            {
                return;
            }

            string details = string.Join(
                Environment.NewLine,
                duplicateGroups
                    .Take(20)
                    .Select(g =>
                    {
                        string rowNumbers = string.Join(
                            ", ",
                            g.Select(x => x.RowNumber)
                        );

                        return
                            "Key = [" + g.Key + "]" +
                            " | Số lần = " + g.Count() +
                            " | Dòng Sheet = " + rowNumbers;
                    })
            );

            throw new Exception(
                "PHÁT HIỆN KEY TRÙNG TRƯỚC KHI MERGE" +
                Environment.NewLine +
                Environment.NewLine +

                "Sheet/API: " + config.ApiName +
                Environment.NewLine +

                "Bảng SQL: " + config.TableName +
                Environment.NewLine +

                "KeyColumns: " +
                string.Join(" + ", config.KeyColumns) +
                Environment.NewLine +
                Environment.NewLine +

                details
            );
        }

        private void EnsureSyncLogTable(SqlConnection conn, SqlTransaction tran)
        {
            string sql = @"
                IF OBJECT_ID(N'dbo.SyncLog', N'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.SyncLog
                    (
                        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        SyncType NVARCHAR(100) NULL,
                        Status NVARCHAR(50) NULL,
                        TotalRows INT NULL,
                        Message NVARCHAR(MAX) NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
                    );
                END
                ";
            ExecuteNonQuery(conn, tran, sql);
        }

        private void InsertSyncLog(SqlConnection conn, SqlTransaction tran, string syncType, string status, int totalRows, string message)
        {
            string sql = @"
            INSERT INTO dbo.SyncLog (SyncType, Status, TotalRows, Message, CreatedAt)
            VALUES (@SyncType, @Status, @TotalRows, @Message, GETDATE());
            ";

            using (SqlCommand cmd = new SqlCommand(sql, conn, tran))
            {
                cmd.Parameters.AddWithValue("@SyncType", syncType);
                cmd.Parameters.AddWithValue("@Status", status);
                cmd.Parameters.AddWithValue("@TotalRows", totalRows);
                cmd.Parameters.AddWithValue("@Message", message ?? "");
                cmd.ExecuteNonQuery();
            }
        }

        private void InsertSyncLogWithoutTran(SqlConnection conn, string syncType, string status, int totalRows, string message)
        {
            string sql = @"
                IF OBJECT_ID(N'dbo.SyncLog', N'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.SyncLog
                    (
                        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        SyncType NVARCHAR(100) NULL,
                        Status NVARCHAR(50) NULL,
                        TotalRows INT NULL,
                        Message NVARCHAR(MAX) NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
                    );
                END

                INSERT INTO dbo.SyncLog (SyncType, Status, TotalRows, Message, CreatedAt)
                VALUES (@SyncType, @Status, @TotalRows, @Message, GETDATE());
                ";

            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                cmd.Parameters.AddWithValue("@SyncType", syncType);
                cmd.Parameters.AddWithValue("@Status", status);
                cmd.Parameters.AddWithValue("@TotalRows", totalRows);
                cmd.Parameters.AddWithValue("@Message", message ?? "");
                cmd.ExecuteNonQuery();
            }
        }

        private int ExecuteNonQuery(SqlConnection conn, SqlTransaction tran, string sql)
        {
            using (SqlCommand cmd = new SqlCommand(sql, conn, tran))
            {
                cmd.CommandTimeout = 120;
                return cmd.ExecuteNonQuery();
            }
        }
    }

    public class SheetSyncConfig
    {
        public string ApiName { get; set; }
        public string TableName { get; set; }
        public string[] KeyColumns { get; set; }
        public string[] Columns { get; set; }
    }
}
