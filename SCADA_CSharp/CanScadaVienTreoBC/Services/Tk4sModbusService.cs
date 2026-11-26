using System;
using System.IO.Ports;

namespace CanScadaVienTreoBC.Services
{
    public class Tk4sModbusService : IDisposable
    {
        private SerialPort _serialPort;

        private const byte DefaultSlaveId = 1;
        private const int DefaultBaudRate = 9600;

        // PV = 301001 = 0x03E8
        private const ushort PvAddress = 0x03E8;

        public bool IsConnected
        {
            get
            {
                return _serialPort != null && _serialPort.IsOpen;
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
            Connect(portName, DefaultBaudRate);
        }

        public void Connect(string portName, int baudRate)
        {
            if (string.IsNullOrWhiteSpace(portName))
                throw new Exception("Tên cổng COM TK4S rỗng.");

            Disconnect();

            _serialPort = new SerialPort
            {
                PortName = portName.Trim(),
                BaudRate = baudRate,
                DataBits = 8,
                Parity = Parity.None,

                // Theo code test TK4S của anh: 8N2
                StopBits = StopBits.Two,

                ReadTimeout = 1000,
                WriteTimeout = 1000
            };

            _serialPort.Open();
        }

        public Tk4sReadResult ReadTemperature()
        {
            return ReadTemperature(DefaultSlaveId);
        }

        public Tk4sReadResult ReadTemperature(byte slaveId)
        {
            if (!IsConnected)
                throw new Exception("TK4S chưa kết nối.");

            short pv = ReadInputRegisterInt16(slaveId, PvAddress);

            return new Tk4sReadResult
            {
                Raw = pv,
                Temperature = pv,
                Text = pv.ToString() + " °C"
            };
        }

        private short ReadInputRegisterInt16(byte slaveId, ushort address)
        {
            byte function = 0x04;
            ushort quantity = 1;

            byte[] frame = new byte[8];

            frame[0] = slaveId;
            frame[1] = function;
            frame[2] = (byte)(address >> 8);
            frame[3] = (byte)(address & 0xFF);
            frame[4] = (byte)(quantity >> 8);
            frame[5] = (byte)(quantity & 0xFF);

            ushort crc = ModbusCRC(frame, 6);

            frame[6] = (byte)(crc & 0xFF);
            frame[7] = (byte)(crc >> 8);

            _serialPort.DiscardInBuffer();
            _serialPort.Write(frame, 0, frame.Length);

            byte[] response = ReadExact(7);

            if (response[0] != slaveId)
                throw new Exception("TK4S trả về sai Slave ID.");

            if (response[1] == (function | 0x80))
                throw new Exception("TK4S Modbus exception: " + response[2]);

            if (response[1] != function)
                throw new Exception("TK4S trả về sai Function Code.");

            ushort crcCalc = ModbusCRC(response, 5);
            ushort crcRecv = (ushort)(response[5] | (response[6] << 8));

            if (crcCalc != crcRecv)
                throw new Exception("TK4S sai CRC.");

            short value = (short)((response[3] << 8) | response[4]);

            return value;
        }

        private byte[] ReadExact(int length)
        {
            byte[] buffer = new byte[length];
            int offset = 0;

            while (offset < length)
            {
                int read = _serialPort.Read(buffer, offset, length - offset);

                if (read <= 0)
                    throw new TimeoutException("Timeout khi đọc TK4S qua RS485.");

                offset += read;
            }

            return buffer;
        }

        private ushort ModbusCRC(byte[] data, int length)
        {
            ushort crc = 0xFFFF;

            for (int pos = 0; pos < length; pos++)
            {
                crc ^= data[pos];

                for (int i = 0; i < 8; i++)
                {
                    bool lsb = (crc & 0x0001) != 0;

                    crc >>= 1;

                    if (lsb)
                        crc ^= 0xA001;
                }
            }

            return crc;
        }

        public void Disconnect()
        {
            try
            {
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
                _serialPort = null;
            }
        }

        public void Dispose()
        {
            Disconnect();
        }
    }

    public class Tk4sReadResult
    {
        public short Raw { get; set; }
        public double Temperature { get; set; }
        public string Text { get; set; }
    }
}
