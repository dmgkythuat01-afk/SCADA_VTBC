using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

namespace CanScadaVienTreoBC.Models
{
    public class KeHoachEpMangInModel
    {
        public string IdEpMangIn { get; set; }
        public string STT { get; set; }
        [JsonProperty("phienBan")]
        public int PhienBan { get; set; }
        [JsonProperty("tenSanPham")]
        public string TenSanPham { get; set; }
        [JsonProperty("thoiGianTao")]
        public string ThoiGianTao { get; set; }
        [JsonProperty("trangThai")]
        public string TrangThai { get; set; }
        [JsonProperty("items")]
        public List<ThungEpMangInModel> Items { get; set; }
        public string DisplayText
        {
            get { return STT + " - " + TenSanPham + " - " + ThoiGianTao + " - " + TrangThai; }
        }
    }

    public class ThungEpMangInModel
    {
        public string IdThungDungVi { get; set; }
        public string IdLapVi { get; set; }
        [JsonProperty("trangThaiXuat")]
        public string TrangThaiXuat { get; set; }
        [JsonProperty("daXuat")]
        public bool DaXuat { get; set; }
        [JsonProperty("soLuongViDaXuat")]
        public decimal SoLuongViDaXuat { get; set; }
        [JsonProperty("thoiGianXuat")]
        public string ThoiGianXuat { get; set; }
    }

    public static class EpMangInPlanRules
    {
        public static string Validate(KeHoachEpMangInModel plan, string boxId)
        {
            if (plan == null || string.IsNullOrWhiteSpace(plan.IdEpMangIn) || plan.PhienBan < 1)
                return "Vui lòng tải và chọn kế hoạch ép màng in trước khi quét thùng.";
            if (string.IsNullOrWhiteSpace(boxId)) return "Vui lòng nhập hoặc quét mã thùng.";
            var matches = (plan.Items ?? new List<ThungEpMangInModel>()).Where(item =>
                string.Equals((item.IdThungDungVi ?? "").Trim(), boxId.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
            if (matches.Count == 0) return "Sai thùng: " + boxId + " không thuộc kế hoạch đang chọn.";
            if (matches.Count != 1) return "Mã thùng bị trùng trong kế hoạch. Vui lòng kiểm tra lại dữ liệu.";
            if (!matches[0].DaXuat || matches[0].SoLuongViDaXuat <= 0)
                return "Thùng " + boxId + " chưa được xác nhận xuất theo kế hoạch.";
            return "";
        }
    }
}
