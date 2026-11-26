using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 
using System.Globalization; 
using Newtonsoft.Json;
 
namespace CanScadaVienTreoBC.Models
{
    public class KeHoachLapViVTBCModel
    {
        [JsonProperty("IdLapVi")]
        public string IdLapVi { get; set; }

        [JsonProperty("STT")]
        public string STT { get; set; }

        [JsonProperty("maSanPham")]
        public string MaSanPham { get; set; }

        [JsonProperty("tenSanPham")]
        public string TenSanPham { get; set; }

        [JsonProperty("tenBaiLieu1")]
        public string TenBaiLieu1 { get; set; }

        [JsonProperty("tenBaiLieu2")]
        public string TenBaiLieu2 { get; set; }

        [JsonProperty("IdThungBanThanhPham1")]
        public string IdThungBanThanhPham1 { get; set; }

        [JsonProperty("IdThungBanThanhPham2")]
        public string IdThungBanThanhPham2 { get; set; }

        [JsonProperty("thoiGianTao")]
        public string ThoiGianTao { get; set; }

        [JsonProperty("nguoiTao")]
        public string NguoiTao { get; set; }

        [JsonProperty("trangThai")]
        public string TrangThai { get; set; }

        [JsonProperty("thoiGianXuat")]
        public string ThoiGianXuat { get; set; }

        [JsonProperty("nguoiXuat")]
        public string NguoiXuat { get; set; }

        [JsonIgnore]
        public DateTime? ThoiGianTaoValue
        {
            get
            {
                return ParseDateTime(ThoiGianTao);
            }
        }

        [JsonIgnore]
        public DateTime? ThoiGianXuatValue
        {
            get
            {
                return ParseDateTime(ThoiGianXuat);
            }
        }

        private static DateTime? ParseDateTime(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            string[] formats =
            {
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd H:mm:ss",
                "yyyy-MM-dd",
                "dd/MM/yyyy HH:mm:ss",
                "d/M/yyyy H:mm:ss",
                "dd/MM/yyyy",
                "d/M/yyyy"
            };

            DateTime value;

            bool success = DateTime.TryParseExact(
                text.Trim(),
                formats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out value
            );

            if (success)
                return value;

            if (DateTime.TryParse(text.Trim(), out value))
                return value;

            return null;
        }
    }
}

