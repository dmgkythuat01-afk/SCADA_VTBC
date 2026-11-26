using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CanScadaVienTreoBC.Models
{
    public class ApiResponse<T>
    {
        public bool success { get; set; }
        public string action { get; set; }
        public string message { get; set; }
        public string serverTime { get; set; }
        public int count { get; set; }
        public T data { get; set; }
    }
}
