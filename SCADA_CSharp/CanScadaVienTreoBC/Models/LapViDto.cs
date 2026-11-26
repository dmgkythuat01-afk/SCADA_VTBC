using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 

namespace CanScadaVienTreoBC.Models
{
    public class LapViDto
    {
        public string maThanPham { get; set; }
        public string soLuongVi { get; set; }
        public string thoiGianTao { get; set; }
        public string nguoiTao { get; set; }

        public string maBanThanhPham1 { get; set; }
        public string maBanThanhPham2 { get; set; }
        public string maBanThanhPham3 { get; set; }
        public string maBanThanhPham4 { get; set; }

        public string soLuongBanThanhPham1 { get; set; }
        public string soLuongBanThanhPham2 { get; set; }
        public string soLuongBanThanhPham3 { get; set; }
        public string soLuongBanThanhPham4 { get; set; }

        // Giữ toàn bộ dữ liệu gốc để sau này cần cột nào dùng tiếp.
        public Dictionary<string, object> Raw { get; set; } = new Dictionary<string, object>();
    }
}
