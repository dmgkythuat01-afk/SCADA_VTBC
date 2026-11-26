using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks; 
using System.Text.RegularExpressions;
using ActUtlTypeLib;

namespace CanScadaVienTreoBC.Services
{
    public class MitsubishiFxPlcService : IDisposable
    {
        private ActUtlType _plc;
        private bool _isConnected;

        public int StationNo { get; private set; } = 0;

        public bool IsConnected
        {
            get { return _isConnected && _plc != null; }
        }

        /// <summary>
        /// Kết nối PLC Mitsubishi FX qua MX Component.
        /// Station mặc định = 0.
        /// Station này phải đúng với Logical station number đã setup successful trong MX Component.
        /// </summary>
        public bool Connect(out string message)
        {
            return Connect(0, out message);
        }

        /// <summary>
        /// Kết nối PLC Mitsubishi FX qua MX Component theo station truyền vào.
        /// </summary>
        public bool Connect(int stationNo, out string message)
        {
            message = "";

            try
            {
                Disconnect();

                StationNo = stationNo;

                _plc = new ActUtlType();
                _plc.ActLogicalStationNumber = stationNo;

                int ret = _plc.Open();

                if (ret == 0)
                {
                    _isConnected = true;
                    message = "Kết nối PLC thành công. Station = " + stationNo;
                    return true;
                }

                _isConnected = false;
                message = "Kết nối PLC lỗi. Station = " + stationNo + ", Code = " + ret;

                SafeClose();
                return false;
            }
            catch (Exception ex)
            {
                _isConnected = false;
                message = "Lỗi kết nối PLC: " + ex.Message;

                SafeClose();
                return false;
            }
        }

        /// <summary>
        /// Ngắt kết nối PLC.
        /// </summary>
        public void Disconnect()
        {
            SafeClose();
            _isConnected = false;
        }

        /// <summary>
        /// Đọc 1 device.
        /// Ví dụ: X0, X1, Y0, M0, D0, D100.
        /// Với X/Y/M thường trả về 0 hoặc 1.
        /// Với D trả về giá trị word.
        /// </summary>
        public bool ReadDevice(string device, out int value, out string message)
        {
            value = 0;
            message = "";

            device = NormalizeDevice(device);

            if (!CheckConnected(out message))
            {
                return false;
            }

            if (!ValidateDevice(device, out message))
            {
                return false;
            }

            try
            {
                int ret = _plc.GetDevice(device, out value);

                if (ret == 0)
                {
                    message = "Read OK: " + device + " = " + value;
                    return true;
                }

                message = "Read lỗi. Device = " + device + ", Code = " + ret;
                return false;
            }
            catch (Exception ex)
            {
                message = "Lỗi Read PLC: " + ex.Message;
                return false;
            }
        }

        /// <summary>
        /// Ghi 1 device.
        /// Ví dụ ghi M0 = 1, D0 = 123, Y0 = 1.
        /// Không cho ghi X vì X là ngõ vào vật lý.
        /// </summary>
        public bool WriteDevice(string device, int value, out string message)
        {
            message = "";

            device = NormalizeDevice(device);

            if (!CheckConnected(out message))
            {
                return false;
            }

            if (!ValidateDevice(device, out message))
            {
                return false;
            }

            string deviceType = GetDeviceType(device);

            if (deviceType == "X")
            {
                message = "X là ngõ vào vật lý, không ghi được. Hãy ghi Y, M hoặc D.";
                return false;
            }

            if ((deviceType == "Y" || deviceType == "M") && value != 0 && value != 1)
            {
                message = "Với Y/M chỉ được ghi 0 hoặc 1.";
                return false;
            }

            try
            {
                int ret = _plc.SetDevice(device, value);

                if (ret == 0)
                {
                    message = "Write OK: " + device + " = " + value;
                    return true;
                }

                message = "Write lỗi. Device = " + device + ", Value = " + value + ", Code = " + ret;
                return false;
            }
            catch (Exception ex)
            {
                message = "Lỗi Write PLC: " + ex.Message;
                return false;
            }
        }

        /// <summary>
        /// Đọc bit tiện dụng.
        /// Dùng cho X/Y/M.
        /// </summary>
        public bool ReadBool(string device, out bool value, out string message)
        {
            value = false;

            int intValue;
            bool ok = ReadDevice(device, out intValue, out message);

            if (!ok)
            {
                return false;
            }

            value = intValue != 0;
            return true;
        }

        /// <summary>
        /// Ghi bit tiện dụng.
        /// Dùng cho Y/M.
        /// </summary>
        public bool WriteBool(string device, bool value, out string message)
        {
            return WriteDevice(device, value ? 1 : 0, out message);
        }

        /// <summary>
        /// Đọc D register tiện dụng.
        /// Ví dụ ReadD(0) đọc D0.
        /// </summary>
        public bool ReadD(int address, out int value, out string message)
        {
            return ReadDevice("D" + address, out value, out message);
        }

        /// <summary>
        /// Ghi D register tiện dụng.
        /// Ví dụ WriteD(0, 123) ghi D0 = 123.
        /// </summary>
        public bool WriteD(int address, int value, out string message)
        {
            return WriteDevice("D" + address, value, out message);
        }

        /// <summary>
        /// Đọc M tiện dụng.
        /// Ví dụ ReadM(0) đọc M0.
        /// </summary>
        public bool ReadM(int address, out bool value, out string message)
        {
            return ReadBool("M" + address, out value, out message);
        }

        /// <summary>
        /// Ghi M tiện dụng.
        /// Ví dụ WriteM(0, true) ghi M0 = ON.
        /// </summary>
        public bool WriteM(int address, bool value, out string message)
        {
            return WriteBool("M" + address, value, out message);
        }

        /// <summary>
        /// Đọc X tiện dụng.
        /// Ví dụ ReadX(0) đọc X0.
        /// </summary>
        public bool ReadX(int address, out bool value, out string message)
        {
            return ReadBool("X" + address, out value, out message);
        }

        /// <summary>
        /// Đọc Y tiện dụng.
        /// Ví dụ ReadY(0) đọc Y0.
        /// </summary>
        public bool ReadY(int address, out bool value, out string message)
        {
            return ReadBool("Y" + address, out value, out message);
        }

        /// <summary>
        /// Ghi Y tiện dụng.
        /// Ví dụ WriteY(0, true) ghi Y0 = ON.
        /// Lưu ý Y có thể bị ladder ghi đè.
        /// </summary>
        public bool WriteY(int address, bool value, out string message)
        {
            return WriteBool("Y" + address, value, out message);
        }

        private bool CheckConnected(out string message)
        {
            message = "";

            if (!_isConnected || _plc == null)
            {
                message = "Chưa kết nối PLC.";
                return false;
            }

            return true;
        }

        private string NormalizeDevice(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return "";
            }

            return input.Trim().ToUpper().Replace(" ", "");
        }

        private bool ValidateDevice(string device, out string message)
        {
            message = "";

            if (string.IsNullOrWhiteSpace(device))
            {
                message = "Device rỗng. Ví dụ đúng: X0, Y0, M0, D0.";
                return false;
            }

            string type = GetDeviceType(device);

            if (type == "")
            {
                message = "Chỉ hỗ trợ X, Y, M, D. Ví dụ đúng: X0, Y0, M0, D0.";
                return false;
            }

            string numberPart = device.Substring(type.Length);

            if (string.IsNullOrWhiteSpace(numberPart))
            {
                message = "Thiếu số địa chỉ. Ví dụ đúng: X0, Y0, M0, D0.";
                return false;
            }

            if (!Regex.IsMatch(numberPart, @"^[0-9]+$"))
            {
                message = "Địa chỉ không hợp lệ. Ví dụ đúng: X0, Y0, M0, D0.";
                return false;
            }

            return true;
        }

        private string GetDeviceType(string device)
        {
            if (device.StartsWith("X")) return "X";
            if (device.StartsWith("Y")) return "Y";
            if (device.StartsWith("M")) return "M";
            if (device.StartsWith("D")) return "D";

            return "";
        }

        private void SafeClose()
        {
            try
            {
                if (_plc != null)
                {
                    _plc.Close();
                    _plc = null;
                }
            }
            catch
            {
                _plc = null;
            }
        }

        public void Dispose()
        {
            Disconnect();
        }
    }
}

