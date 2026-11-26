using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 

namespace CanScadaVienTreoBC.Models
{
    public class ScadaEpMangInPlansData
    {
        [Newtonsoft.Json.JsonProperty("plans")]
        public List<KeHoachEpMangInModel> Plans { get; set; }
        [Newtonsoft.Json.JsonProperty("trace")]
        public CongDoanEpMangInData Trace { get; set; }
    }

    public class CongDoanEpMangInData
    {
        public List<KeHoachLapViVTBCModel> KeHoachLapVi { get; set; }

        public List<ChiTietBTPTheoThungModel> ChiTietBTPTheoThung { get; set; }

        public List<KetQuaLapViModel> KetQuaLapVi { get; set; }

        public CongDoanEpMangInData()
        {
            KeHoachLapVi = new List<KeHoachLapViVTBCModel>();

            ChiTietBTPTheoThung =
                new List<ChiTietBTPTheoThungModel>();

            KetQuaLapVi =
                new List<KetQuaLapViModel>();
        }
    }
}
