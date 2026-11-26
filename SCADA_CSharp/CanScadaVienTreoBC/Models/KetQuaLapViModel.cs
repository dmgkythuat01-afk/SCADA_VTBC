using System;
using Newtonsoft.Json;
using System.Globalization;

namespace CanScadaVienTreoBC.Models
{
    public class KetQuaLapViModel
    {
        [JsonProperty("IdThungDungVi")]
        public string IdThungDungVi { get; set; }

        [JsonProperty("IdLapVi")]
        public string IdLapVi { get; set; }

        [JsonProperty("soLuongViDaLap")]
        public int SoLuongViDaLap { get; set; }

        [JsonProperty("ngaySanXuat")]
        public string NgaySanXuat { get; set; }

        [JsonProperty("thoiGianLuu")]
        public string ThoiGianLuu { get; set; }

        [JsonProperty("nguoiLuu")]
        public string NguoiLuu { get; set; }

        [JsonProperty("vitriKho")]
        public string ViTriKho { get; set; }

        // Hai trường mới
        [JsonProperty("IdThungBanThanhPham1")]
        public string IdThungBanThanhPham1 { get; set; }

        [JsonProperty("IdThungBanThanhPham2")]
        public string IdThungBanThanhPham2 { get; set; }

        [JsonIgnore]
        public DateTime? NgaySanXuatValue
        {
            get
            {
                DateTime value;

                if (TryParseDate(
                    NgaySanXuat,
                    out value))
                {
                    return value.Date;
                }

                return null;
            }
        }

        [JsonIgnore]
        public DateTime? ThoiGianLuuValue
        {
            get
            {
                DateTime value;

                if (TryParseDate(
                    ThoiGianLuu,
                    out value))
                {
                    return value;
                }

                return null;
            }
        }

        private static bool TryParseDate(
            string text,
            out DateTime value)
        {
            value = DateTime.MinValue;

            if (string.IsNullOrWhiteSpace(text))
            {
                return false;
            }

            string[] formats =
            {
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd H:mm:ss",
                "yyyy-MM-dd",

                "dd/MM/yyyy HH:mm:ss",
                "d/M/yyyy H:mm:ss",
                "d/M/yyyy HH:mm:ss",
                "dd/MM/yyyy",

                "M/d/yyyy H:mm:ss",
                "M/d/yyyy HH:mm:ss",
                "MM/dd/yyyy H:mm:ss",
                "MM/dd/yyyy HH:mm:ss",
                "M/d/yyyy",
                "MM/dd/yyyy"
            };

            return DateTime.TryParseExact(
                       text.Trim(),
                       formats,
                       CultureInfo.InvariantCulture,
                       DateTimeStyles.None,
                       out value
                   )
                   ||
                   DateTime.TryParse(
                       text.Trim(),
                       out value
                   );
        }
    }
}
