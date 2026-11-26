using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
 

namespace CanScadaVienTreoBC.Models
{
    public class ApiBanThanhPhamResponse
    {
        public bool success { get; set; }
        public string message { get; set; }
        public string action { get; set; }
        public string serverTime { get; set; }

        public string fromDate { get; set; }
        public string toDate { get; set; }

        public int count { get; set; }

        public List<string> headers { get; set; } = new List<string>();
        public List<Dictionary<string, object>> data { get; set; } = new List<Dictionary<string, object>>();
    }
}
