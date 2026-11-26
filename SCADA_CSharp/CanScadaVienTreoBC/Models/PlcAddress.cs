using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CanScadaVienTreoBC.Models
{
    public static class PlcAddress
    {
        // =========================
        // INPUT X
        // =========================
        public const string X_StartButton = "X0";
        public const string X_StopButton = "X1";
        public const string X_SensorHome = "X2";
        public const string X_SensorEnd = "X3";

        // =========================
        // OUTPUT Y
        // =========================
        public const string Y_MotorRun = "Y0";
        public const string Y_AlarmLamp = "Y1";
        public const string Y_Buzzer = "Y2";

        // =========================
        // INTERNAL RELAY M
        // =========================
        public const string M_AutoMode = "M0";
        public const string M_ManualMode = "M1";
        public const string M_StartCommand = "M10";
        public const string M_StopCommand = "M11";
        public const string M_ResetAlarm = "M12";

        // =========================
        // DATA REGISTER D
        // =========================
        public const string D_CurrentCount = "D0";
        public const string D_TargetCount = "D1";
        public const string D_SpeedSet = "D10";
        public const string D_ErrorCode = "D100";
    }
}
