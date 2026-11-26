using System;
using System.IO.Ports;
using NModbus;
using NModbus.Serial;

namespace CanScadaVienTreoBC.Services
{
    public class Acs180ModbusService : IDisposable
    {
        private SerialPort _serialPort;
        private IModbusMaster _master;

        private const byte DefaultSlaveId = 1;
        private const int DefaultBaudRate = 9600;

        // ACS180:
        // 400005 = Actual value 1
        // NModbus dùng zero-based:
        // 400001 -> 0
        // 400005 -> 4
        private const ushort RegisterAct1 = 4;

        // 46.02 Frequency scaling
        // Nếu đang để 50.00 Hz thì giữ 50.00
        private const double FrequencyScalingHz = 50.00;

        public bool IsConnected
        {
            get
            {
                return _serialPort != null && _serialPort.IsOpen && _master != null;
            }
        }

        public string PortName
        {
            get
            {
                return _serialPort == null ? "" : _serialPort.PortName;
            }
        }

        public void Connect(string portName)
        {
            Connect(portName, DefaultSlaveId, DefaultBaudRate);
        }

        public void Connect(string portName, byte slaveId, int baudRate)
        {
            if (string.IsNullOrWhiteSpace(portName))
                throw new Exception("Tên cổng COM ACS180 rỗng.");

            Disconnect();

            _serialPort = new SerialPort
            {
                PortName = portName.Trim(),
                BaudRate = baudRate,
                DataBits = 8,
                Parity = Parity.None,
                StopBits = StopBits.One,
                ReadTimeout = 1500,
                WriteTimeout = 1500
            };

            _serialPort.Open();

            ModbusFactory factory = new ModbusFactory();
            SerialPortAdapter adapter = new SerialPortAdapter(_serialPort);

            _master = factory.CreateRtuMaster(adapter);
            _master.Transport.ReadTimeout = 1500;
            _master.Transport.WriteTimeout = 1500;
            _master.Transport.Retries = 1;
        }

        public Acs180ReadResult ReadOutputFrequency()
        {
            return ReadOutputFrequency(DefaultSlaveId);
        }

        public Acs180ReadResult ReadOutputFrequency(byte slaveId)
        {
            if (!IsConnected)
                throw new Exception("ACS180 chưa kết nối.");

            ushort[] data = _master.ReadHoldingRegisters(
                slaveId,
                RegisterAct1,
                1
            );

            ushort rawUshort = data[0];

            // ACT1 là signed 16-bit
            short rawSigned = unchecked((short)rawUshort);

            double hz = rawSigned * FrequencyScalingHz / 20000.0;

            return new Acs180ReadResult
            {
                Raw = rawSigned,
                FrequencyHz = hz,
                Text = hz.ToString("0.00") + " Hz"
            };
        }

        public void Disconnect()
        {
            try
            {
                _master = null;

                if (_serialPort != null)
                {
                    if (_serialPort.IsOpen)
                        _serialPort.Close();

                    _serialPort.Dispose();
                    _serialPort = null;
                }
            }
            catch
            {
                _master = null;
                _serialPort = null;
            }
        }

        public void Dispose()
        {
            Disconnect();
        }
    }

    public class Acs180ReadResult
    {
        public short Raw { get; set; }
        public double FrequencyHz { get; set; }
        public string Text { get; set; }
    }
}
