using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CanScadaVienTreoBC.Models
{
    public class ApiMeTronDaXacNhanTodayResponse
    {
        public bool success { get; set; }
        public string action { get; set; }
        public string message { get; set; }
        public string serverTime { get; set; }
        public string today { get; set; }
        public int count { get; set; }
        public List<MeTronDaXacNhanDto> data { get; set; }
    }

}
