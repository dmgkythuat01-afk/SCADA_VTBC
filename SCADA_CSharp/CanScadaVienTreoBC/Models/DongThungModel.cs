using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 
using Newtonsoft.Json;

namespace CanScadaVienTreoBC.Models
{
    public class DongThungModel
    {
        [JsonProperty("noiDungNSXTrenVi")]
        public string NoiDungNSXTrenVi { get; set; }

        [JsonProperty("noiDungDongTren")]
        public string NoiDungDongTren { get; set; }

        [JsonProperty("noiDungDongDuoi")]
        public string NoiDungDongDuoi { get; set; }

        [JsonProperty("thoiGianLuu")]
        public string ThoiGianLuu { get; set; }

        [JsonProperty("nguoiLuu")]
        public string NguoiLuu { get; set; }

        [JsonProperty("ngayInDateVi")]
        public string NgayInDateVi { get; set; }
    }
}
