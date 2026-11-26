using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 
using Newtonsoft.Json;

namespace CanScadaVienTreoBC.Models
{
    public class EpMangInModel
    {
        [JsonProperty("IdThungDungVi")]
        public string IdThungDungVi { get; set; }

        [JsonProperty("noiDungDongTren")]
        public string NoiDungDongTren { get; set; }

        [JsonProperty("noiDungDongDuoi")]
        public string NoiDungDongDuoi { get; set; }

        [JsonProperty("thoiGianLuu")]
        public string ThoiGianLuu { get; set; }

        [JsonProperty("nguoiLuu")]
        public string NguoiLuu { get; set; }

        [JsonProperty("nhietDoTamTren")]
        public string NhietDoTamTren { get; set; }

        [JsonProperty("nhietDoTamDuoi")]
        public string NhietDoTamDuoi { get; set; }

        [JsonProperty("giaNhietGio")]
        public string GiaNhietGio { get; set; }

        [JsonProperty("TocDoCat")]
        public string TocDoCat { get; set; }
    }
}
