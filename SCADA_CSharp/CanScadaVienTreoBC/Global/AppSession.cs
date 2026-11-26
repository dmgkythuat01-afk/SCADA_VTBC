using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CanScadaVienTreoBC.Models;

namespace CanScadaVienTreoBC.Global
{
    public static class AppSession
    {
        public static AccountModel CurrentUser { get; set; }

        public static bool IsLoggedIn
        {
            get { return CurrentUser != null; }
        }

        public static string UseName
        {
            get { return CurrentUser == null ? "" : CurrentUser.useName; }
        }

        public static string Role
        {
            get { return CurrentUser == null ? "" : CurrentUser.role; }
        }

        public static string Department
        {
            get { return CurrentUser == null ? "" : CurrentUser.department; }
        }

        public static void Logout()
        {
            CurrentUser = null;
        }
    }
}
