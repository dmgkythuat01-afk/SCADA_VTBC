using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json; 
using System.Globalization;
using System.Text.RegularExpressions;
  
namespace CanScadaVienTreoBC.Models
{
    public class ChiTietBTPTheoThungModel
    {
        [JsonProperty("IdBanThanhPham")]
        public string IdBanThanhPham { get; set; }

        [JsonProperty("ngaySanXuat")]
        public string NgaySanXuat { get; set; }

        [JsonProperty("IdThungBanThanhPham")]
        public string IdThungBanThanhPham { get; set; }

        [JsonProperty("sttThung")]
        public int? SttThung { get; set; }

        [JsonProperty("khoiLuongThung")]
        public double? KhoiLuongThung { get; set; }

        [JsonProperty("viTriThung")]
        public string ViTriThung { get; set; }

        [JsonIgnore]
        public DateTime? NgaySanXuatValue
        {
            get
            {
                return ParseNgaySanXuat(
                    NgaySanXuat
                );
            }
        }

        private static DateTime? ParseNgaySanXuat(
            string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            string text =
                value.Trim();

            Match match =
                Regex.Match(
                    text,
                    @"NSX(\d{2})(\d{2})(\d{4})",
                    RegexOptions.IgnoreCase
                );

            if (!match.Success)
            {
                match =
                    Regex.Match(
                        text,
                        @"(\d{2})(\d{2})(\d{4})"
                    );
            }

            if (!match.Success)
            {
                return null;
            }

            string dateText =
                match.Groups[1].Value +
                match.Groups[2].Value +
                match.Groups[3].Value;

            DateTime result;

            if (DateTime.TryParseExact(
                dateText,
                "ddMMyyyy",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out result))
            {
                return result.Date;
            }

            return null;
        }
    }
}

