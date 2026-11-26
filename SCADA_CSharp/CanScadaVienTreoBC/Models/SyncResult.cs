using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CanScadaVienTreoBC.Models
{
    public class SyncResult
    {
        public int TotalInserted { get; set; }
        public int TotalUpdated { get; set; }
        public List<string> Logs { get; set; } = new List<string>();
    }
}
