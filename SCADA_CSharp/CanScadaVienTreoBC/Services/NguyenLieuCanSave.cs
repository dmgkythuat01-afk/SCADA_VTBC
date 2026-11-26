using System;
using System.Data;
using System.Linq;

namespace CanScadaVienTreoBC.Services
{
    public static class NguyenLieuCanSave
    {
        public static bool Same(DataRow row, string column, string value)
        {
            return string.Equals(Convert.ToString(row[column]).Trim(), (value ?? "").Trim(), StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsMauMui(string type)
        {
            return string.Equals((type ?? "").Trim(), "Màu mùi", StringComparison.OrdinalIgnoreCase);
        }

        public static DataTable SelectForSave(DataTable source, string phieu, string plan, string recipe,
            string stt, string material, int required, string type, int savedCount)
        {
            if (required <= 0 || savedCount < 0 || savedCount >= required)
                throw new InvalidOperationException("Nguyên liệu đã đủ batch hoặc số lượng kế hoạch không hợp lệ.");
            if (!IsMauMui(type))
            {
                if (savedCount != 0)
                    throw new InvalidOperationException("Nguyên liệu Thường đã có dữ liệu lưu chưa đủ. Cần kiểm tra dữ liệu trước khi lưu lại.");
                return SelectComplete(source, phieu, plan, recipe, stt, material, required);
            }
            var result = source.Clone();
            var rows = source.AsEnumerable().Where(row => Same(row, "PhieuXuatId", phieu) &&
                Same(row, "KeHoachId", plan) && Same(row, "tenBaiLieu", recipe) &&
                Same(row, "STT", stt) && Same(row, "maNguyenLieu", material)).ToList();
            var next = rows.Where(row => Same(row, "SttBatchNL", (savedCount + 1).ToString())).ToList();
            if (next.Count != 1 || rows.Any(row => string.IsNullOrWhiteSpace(Convert.ToString(row["IdBatch"]))) ||
                rows.Select(row => Convert.ToString(row["IdBatch"]).Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != rows.Count)
                throw new InvalidOperationException("Chưa có batch tiếp theo hoặc dữ liệu batch bị trống/trùng. Batch cần lưu: " + (savedCount + 1));
            foreach (DataRow row in rows)
            {
                int number;
                if (!int.TryParse(Convert.ToString(row["SttBatchNL"]), out number) || number <= savedCount || number > required)
                    throw new InvalidOperationException("Số thứ tự batch đã lưu hoặc vượt số lượng kế hoạch.");
            }
            result.ImportRow(next[0]);
            return result;
        }

        // Called under SQL update/range locks. Exact retries do not insert another copy.
        public static DataTable GetNewRows(DataTable incoming, DataTable existing, int required, bool partial)
        {
            var result = incoming.Clone();
            foreach (DataRow row in incoming.Rows)
            {
                var matches = existing.AsEnumerable().Where(old => Same(old, "IdBatch", Convert.ToString(row["IdBatch"])) ||
                    Same(old, "SttBatchNL", Convert.ToString(row["SttBatchNL"]))).ToList();
                if (matches.Count == 0) result.ImportRow(row);
                else if (matches.Count != 1 || !incoming.Columns.Cast<DataColumn>().All(col => existing.Columns.Contains(col.ColumnName) &&
                    string.Equals(Convert.ToString(matches[0][col.ColumnName]), Convert.ToString(row[col.ColumnName]), StringComparison.Ordinal)))
                    throw new InvalidOperationException("Batch đã lưu nhưng dữ liệu khác hoặc số thứ tự bị trùng.");
            }
            if (result.Rows.Count == 0) return result;
            if (result.Rows.Count != incoming.Rows.Count)
                throw new InvalidOperationException("Dữ liệu gửi chứa cả batch mới và batch đã lưu. Cần kiểm tra trước khi lưu.");
            int total = existing.Rows.Count + result.Rows.Count;
            if (required <= 0 || total > required || (!partial && (existing.Rows.Count != 0 || total != required)))
                throw new InvalidOperationException("Không đủ batch nguyên liệu Thường hoặc vượt số batch kế hoạch.");
            var all = existing.AsEnumerable().Concat(result.AsEnumerable()).ToList();
            for (int i = 1; i <= total; i++)
                if (all.Count(row => Same(row, "SttBatchNL", i.ToString())) != 1)
                    throw new InvalidOperationException("Số thứ tự batch không liên tục hoặc bị trùng.");
            if (all.Any(row => string.IsNullOrWhiteSpace(Convert.ToString(row["IdBatch"]))) ||
                all.Select(row => Convert.ToString(row["IdBatch"]).Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != total)
                throw new InvalidOperationException("Mã batch bị trống hoặc trùng.");
            return result;
        }

        public static DataTable SelectComplete(DataTable source, string phieu, string plan, string recipe, string stt, string material, int required)
        {
            var result = source.Clone();
            foreach (DataRow row in source.Rows)
                if (Same(row, "PhieuXuatId", phieu) && Same(row, "KeHoachId", plan) &&
                    Same(row, "tenBaiLieu", recipe) && Same(row, "STT", stt) && Same(row, "maNguyenLieu", material))
                    result.ImportRow(row);
            if (required <= 0 || result.Rows.Count != required)
                throw new InvalidOperationException("Nguyên liệu đang chọn đã cân " + result.Rows.Count + "/" + required + " batch. Cần cân đủ trước khi lưu.");
            var rows = result.AsEnumerable().ToList();
            if (rows.Any(r => string.IsNullOrWhiteSpace(Convert.ToString(r["IdBatch"]))) ||
                rows.Select(r => Convert.ToString(r["IdBatch"]).Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != required)
                throw new InvalidOperationException("Mã batch bị trống hoặc trùng.");
            for (int i = 1; i <= required; i++)
                if (rows.Count(r => Same(r, "SttBatchNL", i.ToString())) != 1)
                    throw new InvalidOperationException("Số thứ tự batch không đủ hoặc bị trùng.");
            return result;
        }
    }
}
