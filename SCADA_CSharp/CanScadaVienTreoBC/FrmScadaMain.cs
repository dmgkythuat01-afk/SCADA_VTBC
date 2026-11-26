using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using CanScadaVienTreoBC.Models;
using CanScadaVienTreoBC.Services;
using CanScadaVienTreoBC.Global;
using Newtonsoft.Json.Linq;
using System.Globalization;
using System.Text.RegularExpressions;
using QRCoder;
using System.Drawing.Printing;
using BarcodeLib;
using CanScadaVienTreoBC.Helpers;
using System.IO.Ports; 
using ActUtlTypeLib;

namespace CanScadaVienTreoBC
{
    public partial class FrmScadaMain : Form
    { 
        private readonly GoogleSheetApiService _googleSheetApiService = new GoogleSheetApiService();
        private bool _allowClose = false;

        private DataTable _dtChiTietTronLieuSanXuat_SCADA;
        private DataTable _dtMeTronDaXacNhan_SCADA;

        /*
         * Dữ liệu vừa lưu của công đoạn ép màng in.
         */
        private DataTable _dtDLEpMangIn;

        /*
         * Dữ liệu vừa lưu của công đoạn đóng thùng.
         */
        private DataTable _dtDLDongThung;

        /*
         * Toàn bộ dữ liệu kết quả lắp vỉ
         * sau khi đã lọc theo ngày người dùng chọn.
         */
        private List<KetQuaLapViModel>
            _listKetQuaLapVi =
                new List<KetQuaLapViModel>();

        private List<ChiTietBTPTheoThungModel>
            _listChiTietBTPTheoThung =
                new List<ChiTietBTPTheoThungModel>();
          
        private List<KeHoachLapViVTBCModel>
            _dsKeHoachLapVi =
                new List<KeHoachLapViVTBCModel>();

        private List<ChiTietBTPTheoThungModel>
            _dsChiTietBTPTheoThung =
                new List<ChiTietBTPTheoThungModel>();

        private List<KetQuaLapViModel>
            _dsKetQuaLapVi =
                new List<KetQuaLapViModel>();

        private List<KeHoachLapViVTBCModel>
            _dsKeHoachLapViTimDuoc =
        new List<KeHoachLapViVTBCModel>();

        private List<ChiTietBTPTheoThungModel>
            _dsChiTietBTPTheoThungTimDuoc =
                new List<ChiTietBTPTheoThungModel>();

        private List<KetQuaLapViModel>
            _dsKetQuaLapViTimDuoc =
                new List<KetQuaLapViModel>();

        private DataTable _dtChiTietBTPtheoThung_DaLuu;
        private DataTable _dtChiTietSanXuatBanThanhPham_DaLuu;

        private string _printTenBaiLieuBTP = "";
        private string _printMaMeTronBTP = "";
        private string _printNgayGioBTP = "";
        private string _printSoLuongVienBTP = "";
        private string _printNoiDungQrBTP = "";
        private Image _printQrImageBTP = null;

        private decimal _tocDoTrungBinhMayTronNgang = 0m;
        private decimal _tocDoTrungBinhMayTronDung = 0m;
        private decimal _nhietDoTrungBinhMayDun1 = 0m;
        private decimal _tocDoTrungBinhMayDun1 = 0m;
        private decimal _nhietDoTrungBinhMayDun2 = 0m;
        private decimal _tocDoTrungBinhMayDun2 = 0m;

        private MitsubishiFxPlcService _plcService = new MitsubishiFxPlcService(); 

        bool sta_tronNgang, sta_tronDung, sta_mayCan, sta_mayDun1, sta_mayDun2, sta_mayCat;
        int tocdo_tronNgang, tocdo_tronDung, tocdo_mayDun1, tocdo_mayDun2;
        int thoigian_tronNgang, thoigianTronDung;
        int nhietdo_mayDun1, nhietdo_mayDun2, nhietdo_mayCan;
        int soLuongVien;

        double sum_tocdo_tronNgang, sum_tocdo_tronDung, sum_tocdo_mayDun1, sum_tocdo_mayDun2;  
        double sum_nhietdo_mayDun1, sum_nhietdo_mayDun2;
        int count_tocdo_tronNgang, count_tocdo_tronDung, count_tocdo_mayDun1, count_tocdo_mayDun2, count_nhietdo_mayDun1, count_nhietdo_mayDun2;

        private readonly Acs180ModbusService _acs180Service = new Acs180ModbusService();
        private readonly Tk4sModbusService _tk4sService = new Tk4sModbusService();

        public FrmScadaMain()
        {
            InitializeComponent();
        }

        private void FrmScadaMain_Load(object sender, EventArgs e)
        {
            rdTronLieu.Checked = true;
            rdHienThiTatCa.Checked = true;
            RenderChiTietBTPTheoThungGrid(null);

            dtbNgayLapVi.Value = DateTime.Today;
            rdCongDoanLapVi.Checked = true;
            cbbChonThoiGianLoc.SelectedIndex = 0;

            RenderKetQuaLapViGrid(new List<KetQuaLapViModel>());

            cbbLuuDL.SelectedIndex = 0;
            KhoiTaoBangDuLieuInDate();
            InitializeEpMangInPlans();
        }

        private void RenderMeTronDaXacNhanGrid(DataTable dt)
        {
            if (dt == null)
                dt = new DataTable();

            dgvKeHoachSanXuat_DaXacNhanTron.AutoGenerateColumns = false;
            dgvKeHoachSanXuat_DaXacNhanTron.Columns.Clear();
            dgvKeHoachSanXuat_DaXacNhanTron.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;

            dgvKeHoachSanXuat_DaXacNhanTron.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colKeHoachId",
                HeaderText = "KeHoachId",
                DataPropertyName = "KeHoachId",
                FillWeight = 30
            });

            dgvKeHoachSanXuat_DaXacNhanTron.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colIdMeTron",
                HeaderText = "IdMeTron",
                DataPropertyName = "IdMeTron",
                FillWeight = 30
            });

            dgvKeHoachSanXuat_DaXacNhanTron.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colThoiGianXacNhanTron",
                HeaderText = "Thời gian xác nhận trộn",
                DataPropertyName = "thoiGianXacNhanTron",
                FillWeight = 40
            });

            dgvKeHoachSanXuat_DaXacNhanTron.DataSource = dt;

            dgvKeHoachSanXuat_DaXacNhanTron.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dgvKeHoachSanXuat_DaXacNhanTron.MultiSelect = false;
            dgvKeHoachSanXuat_DaXacNhanTron.ReadOnly = true;
            dgvKeHoachSanXuat_DaXacNhanTron.AllowUserToAddRows = false;
            dgvKeHoachSanXuat_DaXacNhanTron.RowHeadersVisible = false;
        }

        private async void btnLayDuLieuSanXuat_Click(object sender, EventArgs e)
        {
            try
            {
                btnLayDuLieuSanXuat.Enabled = false;
                btnLayDuLieuSanXuat.Text = "Đang lấy...";

                DateTime today = DateTime.Today;
                dtpChonNgaySX_SX.Value = today;

                AppendLogScada("Đang lấy dữ liệu trộn liệu hôm nay...");

                _dtChiTietTronLieuSanXuat_SCADA =
                    await _googleSheetApiService.GetChiTietTronLieuSanXuatByDateAsync(today);

                _dtMeTronDaXacNhan_SCADA =
                    BuildMeTronDaXacNhanGridTable(_dtChiTietTronLieuSanXuat_SCADA);

                RenderMeTronDaXacNhanGrid(_dtMeTronDaXacNhan_SCADA);

                AppendLogScada(
                    "Đã lấy " +
                    (_dtChiTietTronLieuSanXuat_SCADA == null ? 0 : _dtChiTietTronLieuSanXuat_SCADA.Rows.Count) +
                    " dòng chi tiết, " +
                    (_dtMeTronDaXacNhan_SCADA == null ? 0 : _dtMeTronDaXacNhan_SCADA.Rows.Count) +
                    " mẻ trộn."
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không lấy được dữ liệu sản xuất hôm nay." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada("Lỗi lấy dữ liệu sản xuất hôm nay: " + ex.Message);
            }
            finally
            {
                btnLayDuLieuSanXuat.Enabled = true;
                btnLayDuLieuSanXuat.Text = "Lấy dữ liệu sản xuất";
            }
        }

        private void AppendLogScada(string message)
        {
            string line = "- " + DateTime.Now.ToString("HH:mm:ss") + " " + message;

            if (txtLogHeThong != null)
            {
                txtLogHeThong.AppendText(line + Environment.NewLine);
            }
        }

        private string GetRowValueScada(DataRow row, string columnName)
        {
            if (row == null || row.Table == null || !row.Table.Columns.Contains(columnName))
                return "";

            object value = row[columnName];

            if (value == null || value == DBNull.Value)
                return "";

            return Convert.ToString(value)?.Trim() ?? "";
        }

        private async void btnTaiLaiDuLieu_SX_Click(object sender, EventArgs e)
        {
            try
            {
                btnTaiLaiDuLieu_SX.Enabled = false;
                btnTaiLaiDuLieu_SX.Text = "Đang tải...";

                DateTime ngayChon = dtpChonNgaySX_SX.Value.Date;

                AppendLogScada("Đang lấy dữ liệu trộn liệu ngày " + ngayChon.ToString("dd/MM/yyyy") + "...");

                _dtChiTietTronLieuSanXuat_SCADA =
                    await _googleSheetApiService.GetChiTietTronLieuSanXuatByDateAsync(ngayChon);

                _dtMeTronDaXacNhan_SCADA =
                    BuildMeTronDaXacNhanGridTable(_dtChiTietTronLieuSanXuat_SCADA);

                RenderMeTronDaXacNhanGrid(_dtMeTronDaXacNhan_SCADA);

                AppendLogScada(
                    "Đã lấy " +
                    (_dtChiTietTronLieuSanXuat_SCADA == null ? 0 : _dtChiTietTronLieuSanXuat_SCADA.Rows.Count) +
                    " dòng chi tiết, " +
                    (_dtMeTronDaXacNhan_SCADA == null ? 0 : _dtMeTronDaXacNhan_SCADA.Rows.Count) +
                    " mẻ trộn ngày " +
                    ngayChon.ToString("dd/MM/yyyy") +
                    "."
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không lấy được dữ liệu sản xuất theo ngày." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada("Lỗi tải lại dữ liệu sản xuất theo ngày: " + ex.Message);
            }
            finally
            {
                btnTaiLaiDuLieu_SX.Enabled = true;
                btnTaiLaiDuLieu_SX.Text = "Tải dữ liệu sản xuất";
            }
        }

        private void FrmScadaMain_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (!_allowClose && e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                this.Hide(); 
            }
        }

        private bool TryParseSheetDateTime(string input, out DateTime value)
        {
            value = DateTime.MinValue;

            if (string.IsNullOrWhiteSpace(input))
                return false;

            /*string[] formats =
            {
                "M/d/yyyy H:mm:ss",
                "M/d/yyyy HH:mm:ss",
                "MM/dd/yyyy H:mm:ss",
                "MM/dd/yyyy HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd H:mm:ss",
                "dd/MM/yyyy HH:mm:ss",
                "d/M/yyyy H:mm:ss",
                "d/M/yyyy HH:mm:ss"
            };*/

            string[] formats =
            {
                "yyyy-MM-dd",
                "dd/MM/yyyy",
                "d/M/yyyy",
                "M/d/yyyy",
                "MM/dd/yyyy",

                "M/d/yyyy H:mm:ss",
                "M/d/yyyy HH:mm:ss",
                "MM/dd/yyyy H:mm:ss",
                "MM/dd/yyyy HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd H:mm:ss",
                "dd/MM/yyyy HH:mm:ss",
                "d/M/yyyy H:mm:ss",
                "d/M/yyyy HH:mm:ss"
            };

            return DateTime.TryParseExact(
                input.Trim(),
                formats,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out value
            )
            || DateTime.TryParse(input.Trim(), out value);
        }

        private DataTable BuildMeTronDaXacNhanGridTable(DataTable dtSource)
        {
            DataTable dt = new DataTable();

            dt.Columns.Add("KeHoachId", typeof(string));
            dt.Columns.Add("IdMeTron", typeof(string));
            dt.Columns.Add("tenBaiLieu", typeof(string));
            dt.Columns.Add("thoiGianXacNhanTron", typeof(string));

            if (dtSource == null || dtSource.Rows.Count == 0)
                return dt;

            Dictionary<string, DataRow> map = new Dictionary<string, DataRow>();

            foreach (DataRow row in dtSource.Rows)
            {
                string keHoachId = GetRowValueScada(row, "KeHoachId");
                string idMeTron = GetRowValueScada(row, "IdMeTron");

                if (string.IsNullOrWhiteSpace(keHoachId) || string.IsNullOrWhiteSpace(idMeTron))
                    continue;

                string key = keHoachId.Trim().ToUpper() + "|" + idMeTron.Trim().ToUpper();

                string currentTimeText = GetRowValueScada(row, "thoiGianXacNhanTron");

                if (!map.ContainsKey(key))
                {
                    map[key] = row;
                }
                else
                {
                    string oldTimeText = GetRowValueScada(map[key], "thoiGianXacNhanTron");

                    if (TryParseSheetDateTime(currentTimeText, out DateTime currentTime) &&
                        TryParseSheetDateTime(oldTimeText, out DateTime oldTime) &&
                        currentTime > oldTime)
                    {
                        map[key] = row;
                    }
                }
            }

            List<DataRow> rows = new List<DataRow>(map.Values);

            rows.Sort((a, b) =>
            {
                string ta = GetRowValueScada(a, "thoiGianXacNhanTron");
                string tb = GetRowValueScada(b, "thoiGianXacNhanTron");

                DateTime da;
                DateTime db;

                bool oka = TryParseSheetDateTime(ta, out da);
                bool okb = TryParseSheetDateTime(tb, out db);

                if (oka && okb)
                    return db.CompareTo(da);

                return string.Compare(tb, ta, StringComparison.OrdinalIgnoreCase);
            });

            foreach (DataRow row in rows)
            {
                dt.Rows.Add(
                    GetRowValueScada(row, "KeHoachId"),
                    GetRowValueScada(row, "IdMeTron"),
                    GetRowValueScada(row, "tenBaiLieu"),
                    GetRowValueScada(row, "thoiGianXacNhanTron")
                );
            }

            return dt;
        }

        private void dgvKeHoachSanXuat_DaXacNhanTron_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0)
                return;

            DataGridViewRow gridRow = dgvKeHoachSanXuat_DaXacNhanTron.Rows[e.RowIndex];

            DataRowView row = gridRow.DataBoundItem as DataRowView;

            if (row == null)
                return;

            string tenBaiLieu = Convert.ToString(row["tenBaiLieu"]) ?? "";
            string keHoachId = Convert.ToString(row["KeHoachId"]) ?? "";
            string idMeTron = Convert.ToString(row["IdMeTron"]) ?? "";
            string thoiGianXacNhanTron = Convert.ToString(row["thoiGianXacNhanTron"]) ?? "";

            txtTenBaiLieu.Text = tenBaiLieu; 
            txtMaKeHoachSanXuat.Text = keHoachId;
            txtMaMeTron.Text = idMeTron;

            if (TryParseSheetDateTime(thoiGianXacNhanTron, out DateTime dt))
            {
                txtNgayTron.Text = dt.ToString("dd/MM/yyyy");
                txtGioTron.Text = dt.ToString("HH:mm:ss");
            }
            else
            {
                txtNgayTron.Text = "";
                txtGioTron.Text = "";
            }
        }

        private void btnThemKeHoach_Click(object sender, EventArgs e)
        {
            if (txtTenBaiLieu_Scada.Text.Equals(""))
            {
                txtTenBaiLieu_Scada.Text = txtTenBaiLieu.Text;
            }else
            {
                if(txtTenBaiLieu.Text != txtTenBaiLieu_Scada.Text)
                {
                    MessageBox.Show(
                        "Không hợp lệ, 2 giai đoạn phải cùng 1 bài liệu",
                        "Thông báo",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            }

            if(rdTronLieu.Checked == true)
            {
                txtMaKeHoach_TronLieu.Text = txtMaKeHoachSanXuat.Text;
                txtMaMeTron_TronLieu.Text = txtMaMeTron.Text;
                txtNgayTron_TronLieu.Text = txtNgayTron.Text;
                txtGioTron_TronLieu.Text = txtGioTron.Text;

            }else if(rdTaoVien.Checked == true)
            {
                txtMaKeHoach_TaoVien.Text = txtMaKeHoachSanXuat.Text;
                txtMaMeTron_TaoVien.Text = txtMaMeTron.Text;
                txtNgayTron_TaoVien.Text = txtNgayTron.Text;
                txtGioTron_TaoVien.Text = txtGioTron.Text;
            }
        }

        private void LoadComPortsToComboBox(ComboBox cbo)
        {
            if (cbo == null)
            {
                return;
            }

            string currentValue = cbo.Text?.Trim() ?? "";

            string[] ports = SerialPort
                .GetPortNames()
                .OrderBy(p => GetComPortNumber(p))
                .ToArray();

            cbo.BeginUpdate();

            try
            {
                cbo.Items.Clear();

                foreach (string port in ports)
                {
                    cbo.Items.Add(port);
                }

                if (!string.IsNullOrWhiteSpace(currentValue) && ports.Contains(currentValue))
                {
                    cbo.SelectedItem = currentValue;
                }
                else if (ports.Length > 0)
                {
                    cbo.SelectedIndex = 0;
                }
                else
                {
                    cbo.Text = "";
                }
            }
            finally
            {
                cbo.EndUpdate();
            }
        }

        private int GetComPortNumber(string portName)
        {
            if (string.IsNullOrWhiteSpace(portName))
            {
                return int.MaxValue;
            }

            string numberText = new string(portName.Where(char.IsDigit).ToArray());

            if (int.TryParse(numberText, out int number))
            {
                return number;
            }

            return int.MaxValue;
        }

        private void cbbComTocDo_Click(object sender, EventArgs e)
        {
            LoadComPortsToComboBox(cbbComTocDo);
        }

        private void cbbComNhietDo_Click(object sender, EventArgs e)
        {
            LoadComPortsToComboBox(cbbComNhietDo);
        }

        private void textBox14_TextChanged(object sender, EventArgs e)
        {

        }

        private void cbbComDenSanPham_Click(object sender, EventArgs e)
        {
            LoadComPortsToComboBox(cbbComDenSanPham);
        }

        private async void btnXacNhanHoanThanh_Click(object sender, EventArgs e)
        {
            try
            {
                decimal tongKhoiLuongMe = CalculateTongKhoiLuongMeTuCacThung();

                txtKhoiLuongMeTron.Text = tongKhoiLuongMe.ToString("0.###", CultureInfo.InvariantCulture);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    ex.Message,
                    "Kiểm tra khối lượng thùng",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            if (cbbCaSanXuat.SelectedItem == null)
            {
                MessageBox.Show("Vui lòng chọn ca sản xuất!");
                cbbCaSanXuat.Focus();
                return;
            }

            if (cbbMeTrongCa.SelectedItem == null)
            {
                MessageBox.Show("Vui lòng chọn mẻ sản xuất trong ca!");
                cbbMeTrongCa.Focus();
                return;
            }

            if ((cbbCaSanXuat.SelectedItem != null) && (cbbMeTrongCa.SelectedItem != null))
            {
                txtLotNoSanXuat.Text = "NSX" + DateTime.Now.ToString("ddMMyyyy") + "DM" + cbbCaSanXuat.Text + "." + cbbMeTrongCa.Text;
            }

             _tocDoTrungBinhMayTronNgang = 0m;
             _tocDoTrungBinhMayTronDung = 0m;
             _nhietDoTrungBinhMayDun1 = 0m;
             _tocDoTrungBinhMayDun1 = 0m;
             _nhietDoTrungBinhMayDun2 = 0m;
             _tocDoTrungBinhMayDun2 = 0m;

            _tocDoTrungBinhMayTronNgang = Convert.ToDecimal(txtTocDoTronNgangFn.Text);
            _tocDoTrungBinhMayTronDung = Convert.ToDecimal(txtTocDoTronDungFn.Text);
            _nhietDoTrungBinhMayDun1 = Convert.ToDecimal(txtNhietDoMayDun1Fn.Text);
            _tocDoTrungBinhMayDun1 = Convert.ToDecimal(txtTocDoMayDun1Fn.Text);
            _nhietDoTrungBinhMayDun2 = Convert.ToDecimal(txtNhietDoMayDun2Fn.Text);
            _tocDoTrungBinhMayDun2 = Convert.ToDecimal(txtTocDoMayDun2Fn.Text);

            try
            {
                string maBTP = TaoMaBanThanhPham();

                txtNoiDungQRBTP.Text = maBTP;

                if (ptbQRBTP.Image != null)
                {
                    ptbQRBTP.Image.Dispose();
                    ptbQRBTP.Image = null;
                }

                Bitmap qrImage = TaoAnhQrCode(maBTP);

                ptbQRBTP.SizeMode = PictureBoxSizeMode.Zoom;
                ptbQRBTP.Image = qrImage;

                AppendLogScada("Đã tạo QR bán thành phẩm: " + maBTP);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tạo được mã QR bán thành phẩm." + Environment.NewLine + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada("Lỗi tạo QR bán thành phẩm: " + ex.Message);
            }

            try
            {
                btnXacNhanHoanThanh.Enabled = false;
                btnXacNhanHoanThanh.Text = "Đang lưu...";

                AppendLogScada("Đã nhận lệnh xác nhận hoàn thành bán thành phẩm, đang xử lý...");

                if (string.IsNullOrWhiteSpace(txtMaMeTron_TaoVien.Text))
                {
                    MessageBox.Show(
                        "Vui lòng chọn mẻ trộn trước khi xác nhận hoàn thành.",
                        "Thiếu thông tin",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
                }

                if (string.IsNullOrWhiteSpace(txtSoLuongVien.Text))
                {
                    MessageBox.Show(
                        "Vui lòng nhập số lượng viên.",
                        "Thiếu thông tin",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
                }

                if (string.IsNullOrWhiteSpace(txtNoiDungQRBTP.Text))
                {
                    string maBTP = TaoMaBanThanhPham();
                    txtNoiDungQRBTP.Text = maBTP;

                    if (ptbQRBTP.Image != null)
                    {
                        ptbQRBTP.Image.Dispose();
                        ptbQRBTP.Image = null;
                    }

                    Bitmap qrImage = TaoAnhQrCode(maBTP);

                    ptbQRBTP.SizeMode = PictureBoxSizeMode.Zoom;
                    ptbQRBTP.Image = qrImage;

                    AppendLogScada("Đã tạo QR bán thành phẩm: " + maBTP);
                }

                AppendLogScada("Đang chuẩn bị dữ liệu bán thành phẩm để lưu...");

                DataTable dtSave = BuildChiTietSanXuatBanThanhPhamTable();

                AppendLogScada(
                    "Đang lưu dữ liệu bán thành phẩm lên Google Sheet. " +
                    "IdBTP=" + txtNoiDungQRBTP.Text.Trim() +
                    ", IdMeTron=" + txtMaMeTron_TaoVien.Text.Trim() +
                    ", số dòng=" + dtSave.Rows.Count
                );

                SaveRowsApiResponse res =
                    await _googleSheetApiService.SaveChiTietSanXuatBanThanhPhamAsync(dtSave);

                AppendLogScada(
                    "Đã lưu ChiTietSanXuatBanThanhPham. IdBTP=" +
                    txtNoiDungQRBTP.Text.Trim() +
                    ", dòng=" +
                    res.insertedRows
                );

                DataTable dtThung = BuildChiTietBTPtheoThungTable();

                AppendLogScada(
                    "Đang lưu ChiTietBTPtheoThung. " +
                    "IdBTP=" + txtNoiDungQRBTP.Text.Trim() +
                    ", số thùng=" + dtThung.Rows.Count
                );

                SaveRowsApiResponse resThung =
                    await _googleSheetApiService.SaveChiTietBTPtheoThungAsync(dtThung);

                _dtChiTietSanXuatBanThanhPham_DaLuu = dtSave.Copy();
                _dtChiTietBTPtheoThung_DaLuu = dtThung.Copy();

                RenderChiTietBTPTheoThungGrid(_dtChiTietBTPtheoThung_DaLuu);

                AppendLogScada(
                    "Đã lưu ChiTietBTPtheoThung. IdBTP=" +
                    txtNoiDungQRBTP.Text.Trim() +
                    ", số thùng=" +
                    resThung.insertedRows
                );

                ShowChiTietMeTronSauKhiLuu(dtSave, dtThung, res, resThung);

                MessageBox.Show(
                    "Đã xác nhận hoàn thành và lưu bán thành phẩm thành công." +
                    Environment.NewLine +
                    "Mã BTP: " + txtNoiDungQRBTP.Text.Trim() +
                    Environment.NewLine +
                    "Số dòng ChiTietSanXuatBanThanhPham: " + res.insertedRows +
                    Environment.NewLine +
                    "Số thùng đã lưu: " + resThung.insertedRows,
                    "Thành công",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                // Không xóa thông tin mẻ vội vì còn dùng để in QR thùng
                // txtTenBaiLieu_Scada.Text = "";
                // txtMaKeHoach_TaoVien.Text = "";
                // txtMaMeTron_TaoVien.Text = "";
                // txtNgayTron_TaoVien.Text = "";
                // txtGioTron_TaoVien.Text = "";

                // Chỉ xóa ô cân thùng để tránh dính dữ liệu sang mẻ sau
                txtKLThung1.Text = "0";
                txtKLThung2.Text = "0";
                txtKLThung3.Text = "0";
                txtKLThung4.Text = "0";
                txtKLThung5.Text = "0";

            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không xác nhận hoàn thành được." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada("Lỗi xác nhận hoàn thành BTP: " + ex.Message);
            }
            finally
            {
                btnXacNhanHoanThanh.Enabled = true;
                btnXacNhanHoanThanh.Text = "Xác nhận hoàn thành";
            }
        }

        private string TaoMaBanThanhPham()
        {
            return "BTP" + DateTime.Now.ToString("yyyyMMddHHmmssfff");
        }

        private Bitmap TaoAnhQrCode(string noiDung)
        {
            if (string.IsNullOrWhiteSpace(noiDung))
            {
                throw new Exception("Nội dung QR không được để trống.");
            }

            QRCodeGenerator qrGenerator = new QRCodeGenerator();
            QRCodeData qrCodeData = qrGenerator.CreateQrCode(
                noiDung,
                QRCodeGenerator.ECCLevel.Q
            );

            QRCode qrCode = new QRCode(qrCodeData);

            Bitmap qrImage = qrCode.GetGraphic(
                20,
                Color.Black,
                Color.White,
                true
            );

            return qrImage;
        }

        private void ShowQrToPtbQRBTP(string noiDungQr)
        {
            noiDungQr = (noiDungQr ?? "").Trim();

            if (ptbQRBTP.Image != null)
            {
                Image oldImage = ptbQRBTP.Image;
                ptbQRBTP.Image = null;
                oldImage.Dispose();
            }

            if (string.IsNullOrWhiteSpace(noiDungQr))
            {
                return;
            }

            Bitmap qrImage = TaoAnhQrCode(noiDungQr);

            ptbQRBTP.SizeMode = PictureBoxSizeMode.Zoom;
            ptbQRBTP.Image = qrImage;
        }
        private Image GetQrBtpImageForPrint()
        {
            if (ptbQRBTP.Image != null)
            {
                return new Bitmap(ptbQRBTP.Image);
            }

            string noiDungQr = txtNoiDungQRBTP.Text.Trim();

            if (string.IsNullOrWhiteSpace(noiDungQr))
            {
                throw new Exception("Chưa có nội dung QR bán thành phẩm.");
            }

            return TaoAnhQrCode(noiDungQr);
        }

        private Font FitFont(Graphics g, string text, string fontName, float maxSize, float minSize, FontStyle style, float maxWidth)
        {
            for (float size = maxSize; size >= minSize; size -= 0.5f)
            {
                Font font = new Font(fontName, size, style);
                SizeF measured = g.MeasureString(text, font);

                if (measured.Width <= maxWidth)
                {
                    return font;
                }

                font.Dispose();
            }

            return new Font(fontName, minSize, style);
        }

        private void dataGridViewChiTietThung_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0)
                return;

            DataGridViewRow gridRow = dataGridViewChiTietThung.Rows[e.RowIndex];

            DataRowView rowView = gridRow.DataBoundItem as DataRowView;

            if (rowView == null)
                return;

            txtIdMeTronBTP.Text = GetDataRowViewValue(rowView, "IdBanThanhPham");
            txtLotNoBTP.Text = GetDataRowViewValue(rowView, "ngaySanXuat");
            txtIdThungBTP.Text = GetDataRowViewValue(rowView, "IdThungBanThanhPham");
            txtSttThung.Text = GetDataRowViewValue(rowView, "sttThung");
            txtKhoiLuongThung.Text = GetDataRowViewValue(rowView, "khoiLuongThung");
        }

        private string GetDataRowViewValue(DataRowView rowView, string columnName)
        {
            if (rowView == null || rowView.Row == null || rowView.Row.Table == null)
                return "";

            if (!rowView.Row.Table.Columns.Contains(columnName))
                return "";

            object value = rowView[columnName];

            if (value == null || value == DBNull.Value)
                return "";

            return Convert.ToString(value)?.Trim() ?? "";
        }

        private void txtNoiDungQRBTP_TextChanged(object sender, EventArgs e)
        {
            ShowQrToPtbQRBTP(txtNoiDungQRBTP.Text);
        }

        private void txtIdThungBTP_TextChanged(object sender, EventArgs e)
        {
            ShowQrToPtbQRBTP(txtIdThungBTP.Text);
        }

        private void PrintQrBtpDocument_PrintPage(object sender, PrintPageEventArgs e)
        {
            Graphics g = e.Graphics;
            g.PageUnit = GraphicsUnit.Display;
            g.Clear(Color.White);

            RectangleF page = e.MarginBounds;

            float x = page.Left;
            float y = page.Top;
            float width = page.Width;

            using (StringFormat centerFormat = new StringFormat())
            using (StringFormat leftFormat = new StringFormat())
            {
                centerFormat.Alignment = StringAlignment.Center;
                centerFormat.LineAlignment = StringAlignment.Center;

                leftFormat.Alignment = StringAlignment.Near;
                leftFormat.LineAlignment = StringAlignment.Center;

                using (Font titleFont = FitFont(g, _printTenBaiLieuBTP, "Arial", 18f, 10f, FontStyle.Bold, width))
                using (Font labelFont = new Font("Arial", 10f, FontStyle.Bold))
                using (Font valueFont = new Font("Arial", 10f, FontStyle.Regular))
                using (Font qrTextFont = FitFont(g, _printNoiDungQrBTP, "Arial", 11f, 7f, FontStyle.Bold, width))
                using (Pen linePen = new Pen(Color.Black, 1))
                {
                    // Tên bài liệu
                    RectangleF titleRect = new RectangleF(x, y, width, 34);
                    g.DrawString(_printTenBaiLieuBTP, titleFont, Brushes.Black, titleRect, centerFormat);
                    y += 38;

                    // Đường kẻ
                    g.DrawLine(linePen, x, y, x + width, y);
                    y += 8;

                    // Mã mẻ trộn
                    DrawLabelValueLine(g, "Mã mẻ:", _printMaMeTronBTP, labelFont, valueFont, x, ref y, width);

                    // Ngày giờ
                    DrawLabelValueLine(g, "Thời gian:", _printNgayGioBTP, labelFont, valueFont, x, ref y, width);

                    // Số lượng viên
                    DrawLabelValueLine(g, "Số lượng:", _printSoLuongVienBTP + " viên", labelFont, valueFont, x, ref y, width);

                    y += 6;

                    // QR ở giữa
                    int qrSize = (int)Math.Min(width * 0.72f, 230);
                    float qrX = x + (width - qrSize) / 2f;

                    if (_printQrImageBTP != null)
                    {
                        g.DrawImage(_printQrImageBTP, qrX, y, qrSize, qrSize);
                    }

                    y += qrSize + 8;

                    // Nội dung QR
                    RectangleF qrTextRect = new RectangleF(x, y, width, 36);
                    g.DrawString(_printNoiDungQrBTP, qrTextFont, Brushes.Black, qrTextRect, centerFormat);
                    y += 40;

                    // Đường kẻ cuối
                    g.DrawLine(linePen, x, y, x + width, y);
                }
            }

            e.HasMorePages = false;
        }

        private void DrawLabelValueLine(
            Graphics g,
            string label,
            string value,
            Font labelFont,
            Font valueFont,
            float x,
            ref float y,
            float width)
        {
            float labelWidth = 80;
            float lineHeight = 24;

            RectangleF labelRect = new RectangleF(x, y, labelWidth, lineHeight);
            RectangleF valueRect = new RectangleF(x + labelWidth, y, width - labelWidth, lineHeight);

            using (StringFormat sfLabel = new StringFormat())
            using (StringFormat sfValue = new StringFormat())
            {
                sfLabel.Alignment = StringAlignment.Near;
                sfLabel.LineAlignment = StringAlignment.Center;

                sfValue.Alignment = StringAlignment.Near;
                sfValue.LineAlignment = StringAlignment.Center;

                g.DrawString(label, labelFont, Brushes.Black, labelRect, sfLabel);
                g.DrawString(value ?? "", valueFont, Brushes.Black, valueRect, sfValue);
            }

            y += lineHeight + 2;
        }

        /*
       private void btnInQRBTP_Click(object sender, EventArgs e)
       { 
           try
           {
               string tenBaiLieu = txtTenBaiLieu_Scada.Text.Trim();
               string maMeTron = txtMaMeTron_TaoVien.Text.Trim();
               string soLuongVien = txtSoLuongVien.Text.Trim();
               string noiDungQr = txtNoiDungQRBTP.Text.Trim();

               if (string.IsNullOrWhiteSpace(tenBaiLieu))
               {
                   MessageBox.Show("Chưa có tên bài liệu.", "Thiếu thông tin", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                   return;
               }

               if (string.IsNullOrWhiteSpace(maMeTron))
               {
                   MessageBox.Show("Chưa có mã mẻ trộn.", "Thiếu thông tin", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                   return;
               }

               if (string.IsNullOrWhiteSpace(soLuongVien))
               {
                   MessageBox.Show("Chưa nhập số lượng viên.", "Thiếu thông tin", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                   return;
               }

               if (string.IsNullOrWhiteSpace(noiDungQr))
               {
                   MessageBox.Show("Chưa có nội dung QR bán thành phẩm.", "Thiếu thông tin", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                   return;
               }

               _printTenBaiLieuBTP = tenBaiLieu;
               _printMaMeTronBTP = maMeTron;
               _printNgayGioBTP = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss");
               _printSoLuongVienBTP = soLuongVien;
               _printNoiDungQrBTP = noiDungQr;

               if (_printQrImageBTP != null)
               {
                   _printQrImageBTP.Dispose();
                   _printQrImageBTP = null;
               }

               _printQrImageBTP = GetQrBtpImageForPrint();

               using (PrintDocument printDoc = new PrintDocument())
               {
                   printDoc.DocumentName = "Tem QR bán thành phẩm - " + noiDungQr;

                   // Khổ tem gợi ý: 80mm x 100mm.
                   // Nếu máy in tem của bạn dùng khổ khác, sửa 315/394 tương ứng.
                   // Đơn vị PaperSize là 1/100 inch.
                   printDoc.DefaultPageSettings.PaperSize = new PaperSize("Tem BTP 80x100mm", 315, 394);
                   printDoc.DefaultPageSettings.Margins = new Margins(12, 12, 12, 12);

                   printDoc.PrintPage += PrintQrBtpDocument_PrintPage;

                   using (PrintDialog printDialog = new PrintDialog())
                   {
                       printDialog.Document = printDoc;
                       printDialog.AllowSomePages = false;
                       printDialog.AllowSelection = false;
                       printDialog.UseEXDialog = true;

                       if (printDialog.ShowDialog() == DialogResult.OK)
                       {
                           printDoc.Print();
                           AppendLogScada("Đã gửi lệnh in QR bán thành phẩm: " + noiDungQr);
                       }
                   }
               }
           }
           catch (Exception ex)
           {
               MessageBox.Show(
                   "Không in được QR bán thành phẩm." + Environment.NewLine + ex.Message,
                   "Lỗi",
                   MessageBoxButtons.OK,
                   MessageBoxIcon.Error
               );

               AppendLogScada("Lỗi in QR bán thành phẩm: " + ex.Message);
           }
       } */

        private void btnInQRBTP_Click(object sender, EventArgs e)
        {
            string idThung = txtIdThungBTP.Text.Trim();
            string lotNo = txtLotNoBTP.Text.Trim();
            string khoiLuongThung = txtKhoiLuongThung.Text.Trim();

            if (string.IsNullOrWhiteSpace(idThung))
            {
                MessageBox.Show(
                    "Vui lòng chọn thùng BTP trước khi in QR.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            if (string.IsNullOrWhiteSpace(lotNo))
            {
                MessageBox.Show(
                    "Thiếu Lot/Ngày sản xuất.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            if (string.IsNullOrWhiteSpace(khoiLuongThung))
            {
                MessageBox.Show(
                    "Thiếu khối lượng thùng.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            string tenBaiLieu = GetThongTinInTenBaiLieu(idThung);
            string ngaySanXuat = FormatNgaySanXuatFromLot(lotNo);

            if (string.IsNullOrWhiteSpace(tenBaiLieu))
            {
                tenBaiLieu = "Không xác định";
            }

            try
            {
                ShowQrToPtbQRBTP(idThung);

                PrintDocument printDocument = new PrintDocument();

                printDocument.DocumentName = "QR Thùng BTP - " + idThung;

                // Margins dùng đơn vị 1/100 inch: 4 cm ≈ 157 đơn vị.
                // Chừa đầu giấy để dán băng dính, mã QR bắt đầu dưới vùng này.
                printDocument.DefaultPageSettings.Margins = new Margins(12, 12, 157, 12);

                printDocument.PrintPage += (s, ev) =>
                {
                    DrawQrBtpPrintPage(
                        ev.Graphics,
                        ev.MarginBounds,
                        idThung,
                        tenBaiLieu,
                        ngaySanXuat,
                        lotNo,
                        khoiLuongThung
                    );

                    ev.HasMorePages = false;
                };

                using (PrintDialog printDialog = new PrintDialog())
                {
                    printDialog.Document = printDocument;
                    printDialog.AllowSomePages = false;
                    printDialog.AllowSelection = false;
                    printDialog.UseEXDialog = true;

                    DialogResult result = printDialog.ShowDialog();

                    if (result == DialogResult.OK)
                    {
                        printDocument.Print();

                        AppendLogScada(
                            "Đã in QR thùng BTP. IdThung=" + idThung +
                            ", Lot=" + lotNo +
                            ", KL=" + khoiLuongThung
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không in được QR thùng BTP." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi in QR",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada("Lỗi in QR thùng BTP: " + ex.Message);
            }
        }

        private void EnsureColumn(DataTable dt, string columnName)
        {
            if (dt == null) return;

            if (!dt.Columns.Contains(columnName))
            {
                dt.Columns.Add(columnName, typeof(string));
            }
        }

        private decimal ParseDecimalSafeScada(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return 0m;

            value = value.Trim();

            decimal result;

            if (decimal.TryParse(
                value,
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out result))
            {
                return result;
            }

            if (decimal.TryParse(
                value.Replace(".", "").Replace(",", "."),
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out result))
            {
                return result;
            }

            if (decimal.TryParse(
                value,
                NumberStyles.Any,
                new CultureInfo("vi-VN"),
                out result))
            {
                return result;
            }

            return 0m;
        }

        private decimal GetKhoiLuongThungFromTextBox(TextBox txt, string tenThung)
        {
            if (txt == null)
                return 0m;

            string text = (txt.Text ?? "").Trim();

            if (string.IsNullOrWhiteSpace(text))
                return 0m;

            decimal value = ParseDecimalSafeScada(text);

            if (value < 0)
            {
                throw new Exception(tenThung + " không được nhỏ hơn 0.");
            }

            return Math.Round(value, 3);
        }

        private decimal CalculateTongKhoiLuongMeTuCacThung()
        {
            decimal total = 0m;

            total += GetKhoiLuongThungFromTextBox(txtKLThung1, "Khối lượng thùng 1");
            total += GetKhoiLuongThungFromTextBox(txtKLThung2, "Khối lượng thùng 2");
            total += GetKhoiLuongThungFromTextBox(txtKLThung3, "Khối lượng thùng 3");
            total += GetKhoiLuongThungFromTextBox(txtKLThung4, "Khối lượng thùng 4");
            total += GetKhoiLuongThungFromTextBox(txtKLThung5, "Khối lượng thùng 5");

            total = Math.Round(total, 3);

            if (total <= 0)
            {
                throw new Exception("Chưa có khối lượng thùng nào lớn hơn 0.");
            }

            return total;
        }

        private DataTable BuildChiTietBTPtheoThungTable()
        {
            string idBanThanhPham = txtNoiDungQRBTP.Text.Trim();

            if (string.IsNullOrWhiteSpace(idBanThanhPham))
            {
                throw new Exception("Chưa có IdBanThanhPham để lưu chi tiết thùng.");
            }

            string ngaySanXuat = txtLotNoSanXuat.Text.Trim();

            if (string.IsNullOrWhiteSpace(ngaySanXuat))
            {
                throw new Exception("Chưa có Lot/Ngày sản xuất. Vui lòng chọn ca sản xuất và mẻ trong ca trước khi lưu.");
            }

            DataTable dt = new DataTable();

            dt.Columns.Add("IdBanThanhPham", typeof(string));
            dt.Columns.Add("ngaySanXuat", typeof(string));
            dt.Columns.Add("IdThungBanThanhPham", typeof(string));
            dt.Columns.Add("sttThung", typeof(string));
            dt.Columns.Add("khoiLuongThung", typeof(string));

            AddThungBtpRowIfValid(dt, idBanThanhPham, ngaySanXuat, 1, txtKLThung1);
            AddThungBtpRowIfValid(dt, idBanThanhPham, ngaySanXuat, 2, txtKLThung2);
            AddThungBtpRowIfValid(dt, idBanThanhPham, ngaySanXuat, 3, txtKLThung3);
            AddThungBtpRowIfValid(dt, idBanThanhPham, ngaySanXuat, 4, txtKLThung4);
            AddThungBtpRowIfValid(dt, idBanThanhPham, ngaySanXuat, 5, txtKLThung5);

            if (dt.Rows.Count == 0)
            {
                throw new Exception("Không có thùng nào có khối lượng lớn hơn 0 để lưu.");
            }

            return dt;
        }

        private void AddThungBtpRowIfValid(
            DataTable dt,
            string idBanThanhPham,
            string ngaySanXuat,
            int sttThung,
            TextBox txtKhoiLuong)
        {
            decimal khoiLuong = GetKhoiLuongThungFromTextBox(txtKhoiLuong, "Khối lượng thùng " + sttThung);

            if (khoiLuong <= 0)
                return;

            string idThung = idBanThanhPham + "_T" + sttThung.ToString("000");

            dt.Rows.Add(
                idBanThanhPham,
                ngaySanXuat,
                idThung,
                sttThung.ToString(),
                khoiLuong.ToString("0.###", CultureInfo.InvariantCulture)
            );
        }

        private void ShowChiTietMeTronSauKhiLuu(
            DataTable dtBtp,
            DataTable dtThung,
            SaveRowsApiResponse resBtp,
            SaveRowsApiResponse resThung)
        {
            string idBanThanhPham = txtNoiDungQRBTP.Text.Trim();
            string idMeTron = txtMaMeTron_TaoVien.Text.Trim();
            string tenBaiLieu = txtTenBaiLieu_Scada.Text.Trim();
            string soLuongVienText = txtSoLuongVien.Text.Trim();
            string tongKhoiLuongMe = txtKhoiLuongMeTron.Text.Trim();
            string lotNo = txtLotNoSanXuat.Text.Trim();
            string caSanXuat = cbbCaSanXuat.Text.Trim();
            string meTrongCa = cbbMeTrongCa.Text.Trim();
            string thoiGian = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            StringBuilder sb = new StringBuilder();

            sb.AppendLine("THÔNG TIN BÁN THÀNH PHẨM");
            sb.AppendLine("--------------------------------");
            sb.AppendLine("Tên bài liệu: " + tenBaiLieu);
            sb.AppendLine("Id mẻ trộn: " + idMeTron);
            sb.AppendLine("Id bán thành phẩm: " + idBanThanhPham);
            sb.AppendLine("Lot sản xuất: " + lotNo);
            sb.AppendLine("Ca sản xuất: " + caSanXuat);
            sb.AppendLine("Mẻ trong ca: " + meTrongCa);
            sb.AppendLine("Thời gian hoàn thành: " + thoiGian);
            sb.AppendLine("Số lượng viên: " + soLuongVienText);
            sb.AppendLine("Tổng khối lượng mẻ: " + tongKhoiLuongMe + " kg");
            sb.AppendLine();

            sb.AppendLine("DỮ LIỆU ĐÃ LƯU");
            sb.AppendLine("--------------------------------");
            sb.AppendLine("ChiTietSanXuatBanThanhPham: " + (resBtp == null ? 0 : resBtp.insertedRows) + " dòng");
            sb.AppendLine("ChiTietBTPtheoThung: " + (resThung == null ? 0 : resThung.insertedRows) + " dòng");
            sb.AppendLine();

            sb.AppendLine("CHI TIẾT THÙNG");
            sb.AppendLine("--------------------------------");

            if (dtThung != null && dtThung.Rows.Count > 0)
            {
                foreach (DataRow row in dtThung.Rows)
                {
                    sb.AppendLine(
                        "Thùng " + Convert.ToString(row["sttThung"]) +
                        " | Id: " + Convert.ToString(row["IdThungBanThanhPham"]) +
                        " | Khối lượng: " + Convert.ToString(row["khoiLuongThung"]) + " kg"
                    );
                }
            }
            else
            {
                sb.AppendLine("Không có dữ liệu thùng.");
            }

            txtChiTietMeTron.Text = sb.ToString();
        }

        private async void btnTaiDuLieuLapVi_Click(
            object sender,
            EventArgs e)
        {            
            try
            {
                btnTaiDuLieuLapVi.Enabled =
                    false;

                btnTaiDuLieuLapVi.Text =
                    "Đang tải...";

                ClearKetQuaLapViDetail();

                DateTime ngayChon =
                    dtbNgayLapVi.Value.Date;

                AppendLogScada(
                    "Đang lấy kết quả lắp vỉ có thời gian lưu ngày " +
                    ngayChon.ToString("dd/MM/yyyy") +
                    "..."
                );

                /*
                 * Gọi API và lọc theo ngày sản xuất.
                 */
                _listKetQuaLapVi =
                    await _googleSheetApiService
                        .GetKetQuaLapViByDateAsync(
                            ngayChon
                        );

                /*
                 * Hiển thị lên DataGridView.
                 */
                RenderKetQuaLapViGrid(
                    _listKetQuaLapVi
                );

                AppendLogScada(
                    "Đã lấy " +
                    _listKetQuaLapVi.Count +
                    " thùng có thời gian lưu ngày " +
                    ngayChon.ToString("dd/MM/yyyy") +
                    "."
                );

                if (_listKetQuaLapVi.Count == 0)
                {
                    MessageBox.Show(
                        "Không có dữ liệu lắp vỉ ngày " +
                        ngayChon.ToString("dd/MM/yyyy") +
                        ".",
                        "Thông báo",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );

                    return;
                }

                MessageBox.Show(
                    "Đã lấy " +
                    _listKetQuaLapVi.Count +
                    " dòng kết quả lắp vỉ.",
                    "Thành công",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                _listKetQuaLapVi =
                    new List<KetQuaLapViModel>();

                RenderKetQuaLapViGrid(
                    _listKetQuaLapVi
                );

                MessageBox.Show(
                    "Không lấy được dữ liệu kết quả lắp vỉ." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada(
                    "Lỗi lấy dữ liệu kết quả lắp vỉ: " +
                    ex.Message
                );
            }
            finally
            {
                btnTaiDuLieuLapVi.Enabled =
                    true;

                btnTaiDuLieuLapVi.Text =
                    "Tải dữ liệu lắp vỉ";
            }
        }

        private void dataGridViewKetQuaLapVi_CellClick(
            object sender,
            DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0)
                return;

            string idThungDungVi =
                Convert.ToString(
                    dataGridViewKetQuaLapVi
                        .Rows[e.RowIndex]
                        .Cells["colIdThungDungVi"]
                        .Value
                );

            ShowKetQuaLapViDetailById(
                idThungDungVi
            );
        }

        private void txtIdThungDungVi_TextChanged(
            object sender,
            EventArgs e)
        {
            ShowQrKetQuaLapVi(
                txtIdThungDungVi.Text
            );
        }

        private void ShowQrKetQuaLapVi(
            string noiDungQr)
        {
            noiDungQr =
                (noiDungQr ?? "").Trim();

            /*
             * Xóa và giải phóng ảnh cũ.
             */
            if (ptbQrKetQuaLapVi.Image != null)
            {
                Image oldImage =
                    ptbQrKetQuaLapVi.Image;

                ptbQrKetQuaLapVi.Image =
                    null;

                oldImage.Dispose();
            }

            /*
             * Nếu textbox rỗng thì chỉ xóa QR cũ.
             */
            if (string.IsNullOrWhiteSpace(noiDungQr))
            {
                return;
            }

            try
            {
                Bitmap qrImage =
                    TaoAnhQrCode(noiDungQr);

                ptbQrKetQuaLapVi.SizeMode =
                    PictureBoxSizeMode.Zoom;

                ptbQrKetQuaLapVi.Image =
                    qrImage;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tạo được QR kết quả lắp vỉ." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi QR",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada(
                    "Lỗi tạo QR kết quả lắp vỉ: " +
                    ex.Message
                );
            }
        }

        private void ClearKetQuaLapViDetail()
        {
            txtIdThungDungVi.Clear();
            txtIdLapVi.Clear();
            txtSoLuongViDaLap.Clear();
            txtNgaySanXuat.Clear();
            txtThoiGianLuu.Clear();
            txtViTriKho.Clear();
            txtIdThungBanThanhPham1.Text = "";
            txtIdThungBanThanhPham2.Text = "";

            if (ptbQrKetQuaLapVi.Image != null)
            {
                Image oldImage =
                    ptbQrKetQuaLapVi.Image;

                ptbQrKetQuaLapVi.Image =
                    null;

                oldImage.Dispose();
            }
        }

        private void RenderChiTietBTPTheoThungGrid(DataTable dt)
        {
            if (dt == null)
            {
                dt = new DataTable();
            }

            dataGridViewChiTietThung.AutoGenerateColumns = false;
            dataGridViewChiTietThung.Columns.Clear();
            dataGridViewChiTietThung.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;

            dataGridViewChiTietThung.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colIdBanThanhPham",
                HeaderText = "Id BTP",
                DataPropertyName = "IdBanThanhPham",
                FillWeight = 35
            });

            dataGridViewChiTietThung.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colNgaySanXuat",
                HeaderText = "Ngày/Lot SX",
                DataPropertyName = "ngaySanXuat",
                FillWeight = 35
            });

            dataGridViewChiTietThung.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colIdThungBanThanhPham",
                HeaderText = "Id thùng",
                DataPropertyName = "IdThungBanThanhPham",
                FillWeight = 45
            });

            dataGridViewChiTietThung.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colSttThung",
                HeaderText = "STT thùng",
                DataPropertyName = "sttThung",
                FillWeight = 20
            });

            dataGridViewChiTietThung.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colKhoiLuongThung",
                HeaderText = "Khối lượng",
                DataPropertyName = "khoiLuongThung",
                FillWeight = 25
            });

            dataGridViewChiTietThung.DataSource = dt;
              
            dataGridViewChiTietThung.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewChiTietThung.MultiSelect = false;
            dataGridViewChiTietThung.ReadOnly = true;
            dataGridViewChiTietThung.AllowUserToAddRows = false;
            dataGridViewChiTietThung.AllowUserToDeleteRows = false;
            dataGridViewChiTietThung.RowHeadersVisible = false;
        }

        private void ShowChiTietBTPTheoThungById(
            string idThungBanThanhPham)
        {
            if (string.IsNullOrWhiteSpace(idThungBanThanhPham))
            {
                ClearChiTietBTPTheoThung();
                return;
            }

            ChiTietBTPTheoThungModel item =
                _listChiTietBTPTheoThung
                    .FirstOrDefault(x =>
                        string.Equals(
                            x.IdThungBanThanhPham,
                            idThungBanThanhPham,
                            StringComparison.OrdinalIgnoreCase));

            if (item == null)
            {
                ClearChiTietBTPTheoThung();
                return;
            }

            txtIdBanThanhPhamMeTron.Text =
                item.IdBanThanhPham ?? "";

            txtLotNoNgaySanXuat.Text =
                item.NgaySanXuat ?? "";

            txtIdThungBanThanhPham.Text =
                item.IdThungBanThanhPham ?? "";

            txtSttThungBTP.Text =
                item.SttThung?.ToString() ?? "";

            txtKhoiLuongThungBTP.Text =
                item.KhoiLuongThung?.ToString("0.###") ?? "";
        }

        private void ClearChiTietBTPTheoThung()
        {
            txtIdBanThanhPhamMeTron.Clear();

            txtLotNoNgaySanXuat.Clear();

            txtIdThungBanThanhPham.Clear();

            txtSttThungBTP.Clear();

            txtKhoiLuongThungBTP.Clear();

            if (pictureBoxQrBTPDaLuu.Image != null)
            {
                Image oldImage =
                    pictureBoxQrBTPDaLuu.Image;

                pictureBoxQrBTPDaLuu.Image =
                    null;

                oldImage.Dispose();
            }
        }

        private async void btnInQRThung_Click(
            object sender,
            EventArgs e)
        {
            /*
             * Công đoạn tạo viên:
             * in lại thùng bán thành phẩm đã lưu.
             */
            if (rdCongDoanTaoVien.Checked)
            {
                await InQrBTPDaLuu();
                return;
            }

            /*
             * Công đoạn lắp vỉ.
             */
            if (rdCongDoanLapVi.Checked)
            {
                InQrKetQuaLapVi();
                return;
            }

            MessageBox.Show(
                "Vui lòng chọn công đoạn cần in QR.",
                "Thông báo",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        private string FormatNgaySanXuatBTP(
            string lotNo)
        {
            if (string.IsNullOrWhiteSpace(lotNo))
            {
                return "";
            }

            string text =
                lotNo.Trim();

            /*
             * Định dạng mong đợi:
             * NSX11072026DM2.3
             *
             * Group 1 = 11
             * Group 2 = 07
             * Group 3 = 2026
             */
            Match match =
                Regex.Match(
                    text,
                    @"NSX(\d{2})(\d{2})(\d{4})",
                    RegexOptions.IgnoreCase
                );

            if (!match.Success)
            {
                /*
                 * Dự phòng nếu chuỗi không có chữ NSX
                 * nhưng vẫn chứa ddMMyyyy.
                 */
                match =
                    Regex.Match(
                        text,
                        @"(\d{2})(\d{2})(\d{4})"
                    );
            }

            if (!match.Success)
            {
                return "";
            }

            string dateText =
                match.Groups[1].Value +
                match.Groups[2].Value +
                match.Groups[3].Value;

            DateTime ngaySanXuat;

            bool success =
                DateTime.TryParseExact(
                    dateText,
                    "ddMMyyyy",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out ngaySanXuat
                );

            if (!success)
            {
                return "";
            }

            return ngaySanXuat.ToString(
                "dd/MM/yyyy"
            );
        }

        private async Task InQrBTPDaLuu()
        {
            string idBanThanhPham =
                (txtIdBanThanhPhamMeTron.Text ?? "")
                    .Trim();

            string lotNoNgaySanXuat =
                (txtLotNoNgaySanXuat.Text ?? "")
                    .Trim();

            string idThungBanThanhPham =
                (txtIdThungBanThanhPham.Text ?? "")
                    .Trim();

            string sttThung =
                (txtSttThungBTP.Text ?? "")
                    .Trim();

            string khoiLuongThung =
                (txtKhoiLuongThungBTP.Text ?? "")
                    .Trim();

            /*
             * Kiểm tra ID thùng.
             */
            if (string.IsNullOrWhiteSpace(
                idThungBanThanhPham))
            {
                MessageBox.Show(
                    "Chưa có ID thùng bán thành phẩm." +
                    Environment.NewLine +
                    "Vui lòng chọn một dòng trong bảng BTP theo thùng.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                dataGridViewBTPTheoThung.Focus();
                return;
            }

            if (string.IsNullOrWhiteSpace(
                idBanThanhPham))
            {
                MessageBox.Show(
                    "Thiếu ID bán thành phẩm.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            if (string.IsNullOrWhiteSpace(
                lotNoNgaySanXuat))
            {
                MessageBox.Show(
                    "Thiếu Lot/Ngày sản xuất.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            if (string.IsNullOrWhiteSpace(
                khoiLuongThung))
            {
                MessageBox.Show(
                    "Thiếu khối lượng thùng.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            /*
             * Nếu PictureBox chưa có QR,
             * tạo lại từ ID thùng.
             */
            if (pictureBoxQrBTPDaLuu.Image == null)
            {
                try
                {
                    ShowQrBTPDaLuu(
                        idThungBanThanhPham
                    );
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        "Không tạo được QR thùng bán thành phẩm." +
                        Environment.NewLine +
                        ex.Message,
                        "Lỗi QR",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );

                    return;
                }
            }

            string ngaySanXuatDisplay =
                FormatNgaySanXuatBTP(
                    lotNoNgaySanXuat
                );

            try
            {
                string tenBaiLieu = GetTenBaiLieuByIdBanThanhPham(idBanThanhPham);
                if (string.IsNullOrWhiteSpace(tenBaiLieu))
                {
                    // Reprinted containers may not be present in the current production cache.
                    var response = await _googleSheetApiService.GetChiTietSanXuatBanThanhPhamRecentMonthAsync();
                    DataTable details = _googleSheetApiService.ConvertDictionaryListToDataTable(response.data, response.headers);
                    if (details.Columns.Contains("IdBanThanhPham") && details.Columns.Contains("tenBaiLieu"))
                        tenBaiLieu = details.AsEnumerable()
                            .Where(row => string.Equals(Convert.ToString(row["IdBanThanhPham"]).Trim(), idBanThanhPham, StringComparison.OrdinalIgnoreCase))
                            .Select(row => Convert.ToString(row["tenBaiLieu"]).Trim())
                            .FirstOrDefault(name => !string.IsNullOrWhiteSpace(name));
                }
                if (string.IsNullOrWhiteSpace(tenBaiLieu))
                    throw new Exception("Không tìm thấy tên bài liệu của BTP " + idBanThanhPham + " trong dữ liệu hiện có và dữ liệu một tháng gần nhất.");

                using (PrintDocument printDocument =
                    new PrintDocument())
                {
                    printDocument.DocumentName =
                        "QR thùng bán thành phẩm - " +
                        idThungBanThanhPham;

                    printDocument.DefaultPageSettings.Margins =
                        new Margins(
                            12,
                            12,
                            12,
                            12
                        );

                    /*
                     * Có thể bật nếu máy in dùng tem 80 x 100 mm.
                     */
                    // printDocument.DefaultPageSettings.PaperSize =
                    //     new PaperSize(
                    //         "Tem BTP 80x100mm",
                    //         315,
                    //         394
                    //     );

                    printDocument.PrintPage +=
                        (s, ev) =>
                        {
                            DrawQrBTPDaLuuPrintPage(
                                ev.Graphics,
                                ev.MarginBounds,
                                idBanThanhPham,
                                lotNoNgaySanXuat,
                                ngaySanXuatDisplay,
                                idThungBanThanhPham,
                                sttThung,
                                khoiLuongThung,
                                tenBaiLieu
                            );

                            ev.HasMorePages =
                                false;
                        };

                    using (PrintDialog printDialog =
                        new PrintDialog())
                    {
                        printDialog.Document =
                            printDocument;

                        printDialog.AllowSomePages =
                            false;

                        printDialog.AllowSelection =
                            false;

                        printDialog.UseEXDialog =
                            true;

                        DialogResult result =
                            printDialog.ShowDialog();

                        if (result ==
                            DialogResult.OK)
                        {
                            printDocument.Print();

                            AppendLogScada(
                                "Đã in QR thùng BTP đã lưu. " +
                                "IdThung=" +
                                idThungBanThanhPham +
                                ", IdBTP=" +
                                idBanThanhPham +
                                ", Lot=" +
                                lotNoNgaySanXuat
                            );
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không in được QR thùng bán thành phẩm." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi in QR",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada(
                    "Lỗi in QR thùng BTP đã lưu: " +
                    ex.Message
                );
            }
        }

        private void DrawQrBTPDaLuuPrintPage(
            Graphics g,
            Rectangle marginBounds,
            string idBanThanhPham,
            string lotNoNgaySanXuat,
            string ngaySanXuatDisplay,
            string idThungBanThanhPham,
            string sttThung,
            string khoiLuongThung,
            string tenBaiLieu)
        {
            g.Clear(
                Color.White
            );

            using (Font fontTitle =
                new Font(
                    "Arial",
                    11,
                    FontStyle.Bold
                ))
            using (Font fontQrContent =
                new Font(
                    "Arial",
                    8,
                    FontStyle.Bold
                ))
            using (Font fontLabel =
                new Font(
                    "Arial",
                    8,
                    FontStyle.Bold
                ))
            using (Font fontNormal =
                new Font(
                    "Arial",
                    8,
                    FontStyle.Regular
                ))
            using (Font fontLotNo =
                new Font(
                    "Arial",
                    13,
                    FontStyle.Bold
                ))
            using (Font fontNgaySanXuat =
                new Font(
                    "Arial",
                    15,
                    FontStyle.Bold
                ))
            using (Brush brush =
                new SolidBrush(
                    Color.Black
                ))
            using (Pen linePen =
                new Pen(
                    Color.Black,
                    1
                ))
            {
                int x =
                    marginBounds.Left;

                int y =
                    marginBounds.Top;

                int pageWidth =
                    marginBounds.Width;

                /*
                 * Tiêu đề.
                 */
                DrawCenteredTextLapVi(
                    g,
                    "THÙNG BÁN THÀNH PHẨM",
                    fontTitle,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 25;

                g.DrawLine(
                    linePen,
                    x,
                    y,
                    x + pageWidth,
                    y
                );

                y += 6;

                /*
                 * QR ở giữa.
                 */
                int qrSize =
                    Math.Min(
                        220,
                        pageWidth
                    );

                int qrX =
                    x +
                    (pageWidth - qrSize) / 2;

                Image qrImage =
                    null;

                bool disposeQrImage =
                    false;

                /*
                 * Ưu tiên lấy QR từ PictureBox.
                 */
                if (pictureBoxQrBTPDaLuu.Image != null)
                {
                    qrImage =
                        pictureBoxQrBTPDaLuu.Image;
                }
                else
                {
                    qrImage =
                        TaoAnhQrCode(
                            idThungBanThanhPham
                        );

                    disposeQrImage =
                        true;
                }

                try
                {
                    if (qrImage != null)
                    {
                        g.DrawImage(
                            qrImage,
                            new Rectangle(
                                qrX,
                                y,
                                qrSize,
                                qrSize
                            )
                        );
                    }
                }
                finally
                {
                    /*
                     * Không Dispose ảnh đang gắn trên PictureBox.
                     */
                    if (disposeQrImage &&
                        qrImage != null)
                    {
                        qrImage.Dispose();
                    }
                }

                y += qrSize + 5;

                /*
                 * Nội dung QR ngay dưới mã QR.
                 */
                DrawCenteredTextLapVi(
                    g,
                    idThungBanThanhPham,
                    fontQrContent,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 22;

                g.DrawLine(
                    linePen,
                    x,
                    y,
                    x + pageWidth,
                    y
                );

                y += 7;

                /*
                 * Các thông tin từ CellClick.
                 
                DrawLapViLabelValue(
                    g,
                    "ID BTP:",
                    idBanThanhPham,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );*/

                // Measure the wrapped recipe name and reserve its full height.
                using (StringFormat recipeFormat = new StringFormat())
                {
                    recipeFormat.Alignment = StringAlignment.Center;
                    SizeF recipeSize = g.MeasureString(tenBaiLieu, fontLabel, pageWidth, recipeFormat);
                    float recipeHeight = (float)Math.Ceiling(recipeSize.Height);
                    g.DrawString(tenBaiLieu, fontLabel, brush,
                        new RectangleF(x, y, pageWidth, recipeHeight), recipeFormat);
                    y += (int)recipeHeight + 6;
                }

                DrawLapViLabelValue(
                    g,
                    "ID thùng:",
                    idThungBanThanhPham,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );

                DrawLapViLabelValue(
                    g,
                    "STT thùng:",
                    sttThung,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );

                string khoiLuongDisplay =
                    string.IsNullOrWhiteSpace(
                        khoiLuongThung
                    )
                        ? ""
                        : khoiLuongThung + " kg";

                DrawLapViLabelValue(
                    g,
                    "Khối lượng:",
                    khoiLuongDisplay,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );

                y += 5;

                /*
                 * Lot/Ngày sản xuất nguyên bản:
                 * NSX11072026DM2.3
                 */
                DrawCenteredTextLapVi(
                    g,
                    "LOT / NGÀY SẢN XUẤT",
                    fontLabel,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 18;

                DrawCenteredTextLapVi(
                    g,
                    lotNoNgaySanXuat,
                    fontLotNo,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 29;

                /*
                 * Ngày đã chuyển đổi:
                 * 11/07/2026
                 */
                if (!string.IsNullOrWhiteSpace(
                    ngaySanXuatDisplay))
                {
                    DrawCenteredTextLapVi(
                        g,
                        ngaySanXuatDisplay,
                        fontNgaySanXuat,
                        brush,
                        x,
                        y,
                        pageWidth
                    );

                    y += 32;
                }

                g.DrawLine(
                    linePen,
                    x,
                    y,
                    x + pageWidth,
                    y
                );
            }
        }

        private void InQrKetQuaLapVi()
        {
            string idThungDungVi =
                (txtIdThungDungVi.Text ?? "").Trim();

            string idLapVi =
                (txtIdLapVi.Text ?? "").Trim();

            string soLuongViDaLap =
                (txtSoLuongViDaLap.Text ?? "").Trim();

            string ngaySanXuat =
                (txtNgaySanXuat.Text ?? "").Trim();

            string thoiGianLuu =
                (txtThoiGianLuu.Text ?? "").Trim();

            string viTriKho =
                (txtViTriKho.Text ?? "").Trim();

            /*
             * Kiểm tra mã thùng.
             */
            if (string.IsNullOrWhiteSpace(idThungDungVi))
            {
                MessageBox.Show(
                    "Chưa có ID thùng đựng vỉ." +
                    Environment.NewLine +
                    "Vui lòng chọn một dòng trong bảng kết quả lắp vỉ.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                dataGridViewKetQuaLapVi.Focus();
                return;
            }

            /*
             * Kiểm tra QR đã được tạo hay chưa.
             */
            if (ptbQrKetQuaLapVi.Image == null)
            {
                /*
                 * Nếu PictureBox chưa có QR thì tự tạo lại
                 * từ mã thùng.
                 */
                try
                {
                    ShowQrKetQuaLapVi(
                        idThungDungVi
                    );
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        "Không tạo được QR cho thùng lắp vỉ." +
                        Environment.NewLine +
                        ex.Message,
                        "Lỗi QR",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );

                    return;
                }
            }

            /*
             * Có thể bắt buộc kiểm tra thêm các trường.
             */
            if (string.IsNullOrWhiteSpace(idLapVi))
            {
                MessageBox.Show(
                    "Thiếu ID lắp vỉ.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            if (string.IsNullOrWhiteSpace(ngaySanXuat))
            {
                MessageBox.Show(
                    "Thiếu ngày sản xuất.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            if (string.IsNullOrWhiteSpace(viTriKho))
            {
                MessageBox.Show(
                    "Thiếu vị trí kho.",
                    "Thiếu thông tin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            try
            {
                using (PrintDocument printDocument =
                    new PrintDocument())
                {
                    printDocument.DocumentName =
                        "QR thùng lắp vỉ - " +
                        idThungDungVi;

                    /*
                     * Margin nhỏ giống phần tem BTP.
                     */
                    printDocument.DefaultPageSettings.Margins =
                        new Margins(
                            12,
                            12,
                            12,
                            12
                        );

                    /*
                     * Nếu máy in tem dùng khổ 80 x 100 mm,
                     * có thể bật dòng PaperSize bên dưới.
                     *
                     * Đơn vị là 1/100 inch:
                     * 80 mm ≈ 315
                     * 100 mm ≈ 394
                     */
                    // printDocument.DefaultPageSettings.PaperSize =
                    //     new PaperSize(
                    //         "Tem lắp vỉ 80x100mm",
                    //         315,
                    //         394
                    //     );

                    printDocument.PrintPage +=
                        (s, ev) =>
                        {
                            DrawQrKetQuaLapViPrintPage(
                                ev.Graphics,
                                ev.MarginBounds,
                                idThungDungVi,
                                idLapVi,
                                soLuongViDaLap,
                                ngaySanXuat,
                                thoiGianLuu,
                                viTriKho
                            );

                            ev.HasMorePages =
                                false;
                        };

                    using (PrintDialog printDialog =
                        new PrintDialog())
                    {
                        printDialog.Document =
                            printDocument;

                        printDialog.AllowSomePages =
                            false;

                        printDialog.AllowSelection =
                            false;

                        printDialog.UseEXDialog =
                            true;

                        DialogResult result =
                            printDialog.ShowDialog();

                        if (result ==
                            DialogResult.OK)
                        {
                            printDocument.Print();

                            AppendLogScada(
                                "Đã in QR thùng lắp vỉ. " +
                                "IdThungDungVi=" +
                                idThungDungVi +
                                ", IdLapVi=" +
                                idLapVi +
                                ", Vị trí=" +
                                viTriKho
                            );
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không in được QR thùng lắp vỉ." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi in QR",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada(
                    "Lỗi in QR thùng lắp vỉ: " +
                    ex.Message
                );
            }
        }

        private void DrawQrKetQuaLapViPrintPage(
            Graphics g,
            Rectangle marginBounds,
            string idThungDungVi,
            string idLapVi,
            string soLuongViDaLap,
            string ngaySanXuat,
            string thoiGianLuu,
            string viTriKho)
        {
            /*
             * Làm sạch nền trang.
             */
            g.Clear(Color.White);

            /*
             * Font dùng trên tem.
             */
            using (Font fontTitle =
                new Font(
                    "Arial",
                    11,
                    FontStyle.Bold
                ))
            using (Font fontQrContent =
                new Font(
                    "Arial",
                    8,
                    FontStyle.Bold
                ))
            using (Font fontLabel =
                new Font(
                    "Arial",
                    8,
                    FontStyle.Bold
                ))
            using (Font fontNormal =
                new Font(
                    "Arial",
                    8,
                    FontStyle.Regular
                ))
            using (Font fontNgaySanXuat =
                new Font(
                    "Arial",
                    13,
                    FontStyle.Bold
                ))
            using (Font fontViTriKho =
                new Font(
                    "Arial",
                    15,
                    FontStyle.Bold
                ))
            using (Brush brush =
                new SolidBrush(Color.Black))
            using (Pen linePen =
                new Pen(Color.Black, 1))
            {
                int x =
                    marginBounds.Left;

                int y =
                    marginBounds.Top;

                int pageWidth =
                    marginBounds.Width;

                /*
                 * Tiêu đề.
                 */
                DrawCenteredTextLapVi(
                    g,
                    "THÙNG THÀNH PHẨM LẮP VỈ",
                    fontTitle,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 25;

                /*
                 * Đường kẻ dưới tiêu đề.
                 */
                g.DrawLine(
                    linePen,
                    x,
                    y,
                    x + pageWidth,
                    y
                );

                y += 6;

                /*
                 * Kích thước QR.
                 *
                 * Nếu tem nhỏ, QR sẽ tự giới hạn
                 * theo chiều rộng của trang.
                 */
                int qrSize =
                    Math.Min(
                        220,
                        pageWidth
                    );

                int qrX =
                    x +
                    (pageWidth - qrSize) / 2;

                Image qrImage =
                    null;

                bool disposeQrImage =
                    false;

                /*
                 * Ưu tiên lấy ảnh đúng từ PictureBox.
                 */
                if (ptbQrKetQuaLapVi.Image != null)
                {
                    qrImage =
                        ptbQrKetQuaLapVi.Image;
                }
                else
                {
                    /*
                     * Trường hợp PictureBox chưa có ảnh,
                     * tạo QR tạm thời.
                     */
                    qrImage =
                        TaoAnhQrCode(
                            idThungDungVi
                        );

                    disposeQrImage =
                        true;
                }

                try
                {
                    if (qrImage != null)
                    {
                        g.DrawImage(
                            qrImage,
                            new Rectangle(
                                qrX,
                                y,
                                qrSize,
                                qrSize
                            )
                        );
                    }
                }
                finally
                {
                    /*
                     * Chỉ Dispose nếu đây là ảnh tạm.
                     * Không Dispose ảnh đang nằm trong PictureBox.
                     */
                    if (disposeQrImage &&
                        qrImage != null)
                    {
                        qrImage.Dispose();
                    }
                }

                y += qrSize + 5;

                /*
                 * Nội dung QR ngay dưới hình QR.
                 */
                DrawCenteredTextLapVi(
                    g,
                    idThungDungVi,
                    fontQrContent,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 22;

                /*
                 * Đường phân cách.
                 */
                g.DrawLine(
                    linePen,
                    x,
                    y,
                    x + pageWidth,
                    y
                );

                y += 7;

                /*
                 * ID thùng.
                 
                DrawLapViLabelValue(
                    g,
                    "ID thùng:",
                    idThungDungVi,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );*/

                /*
                 * Số lượng vỉ đã lắp.
                 */
                string soLuongDisplay =
                    string.IsNullOrWhiteSpace(
                        soLuongViDaLap
                    )
                        ? ""
                        : soLuongViDaLap + " vỉ";

                DrawLapViLabelValue(
                    g,
                    "Số lượng:",
                    soLuongDisplay,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );


                /*
                 * ID lắp vỉ.
                 */
                DrawLapViLabelValue(
                    g,
                    "ID KH lắp vỉ:",
                    idLapVi,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );

                
                

                y += 3;

                /*
                 * Ngày sản xuất:
                 * in đậm và lớn hơn.
                 */
                DrawCenteredTextLapVi(
                    g,
                    "NGÀY SẢN XUẤT",
                    fontLabel,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 18;

                DrawCenteredTextLapVi(
                    g,
                    ngaySanXuat,
                    fontNgaySanXuat,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 29;

                /*
                 * Thời gian lưu.
                 */
                DrawLapViLabelValue(
                    g,
                    "Ngày lắp vỉ:",
                    thoiGianLuu,
                    fontLabel,
                    fontNormal,
                    brush,
                    x,
                    ref y,
                    pageWidth
                );

                /*
                 * Vị trí kho:
                 * in đậm và lớn nhất.
                 */
                DrawCenteredTextLapVi(
                    g,
                    "VỊ TRÍ KHO",
                    fontLabel,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 18;

                DrawCenteredTextLapVi(
                    g,
                    viTriKho,
                    fontViTriKho,
                    brush,
                    x,
                    y,
                    pageWidth
                );

                y += 32;

                /*
                 * Đường kẻ cuối tem.
                 */
                g.DrawLine(
                    linePen,
                    x,
                    y,
                    x + pageWidth,
                    y
                );
            }
        }

        private void DrawCenteredTextLapVi(
            Graphics g,
            string text,
            Font font,
            Brush brush,
            int x,
            int y,
            int width)
        {
            using (StringFormat format =
                new StringFormat())
            {
                format.Alignment =
                    StringAlignment.Center;

                format.LineAlignment =
                    StringAlignment.Near;

                RectangleF rect =
                    new RectangleF(
                        x,
                        y,
                        width,
                        font.Height + 8
                    );

                g.DrawString(
                    text ?? "",
                    font,
                    brush,
                    rect,
                    format
                );
            }
        }

        private void DrawLapViLabelValue(
            Graphics g,
            string label,
            string value,
            Font labelFont,
            Font valueFont,
            Brush brush,
            int x,
            ref int y,
            int pageWidth)
        {
            int labelWidth =
                Math.Min(
                    95,
                    pageWidth / 3
                );

            int valueWidth =
                pageWidth - labelWidth;

            RectangleF labelRect =
                new RectangleF(
                    x,
                    y,
                    labelWidth,
                    25
                );

            RectangleF valueRect =
                new RectangleF(
                    x + labelWidth,
                    y,
                    valueWidth,
                    25
                );

            using (StringFormat labelFormat =
                new StringFormat())
            using (StringFormat valueFormat =
                new StringFormat())
            {
                labelFormat.Alignment =
                    StringAlignment.Near;

                labelFormat.LineAlignment =
                    StringAlignment.Center;

                valueFormat.Alignment =
                    StringAlignment.Near;

                valueFormat.LineAlignment =
                    StringAlignment.Center;

                valueFormat.Trimming =
                    StringTrimming.EllipsisCharacter;

                g.DrawString(
                    label ?? "",
                    labelFont,
                    brush,
                    labelRect,
                    labelFormat
                );

                g.DrawString(
                    value ?? "",
                    valueFont,
                    brush,
                    valueRect,
                    valueFormat
                );
            }

            y += 25;
        }

        private async void btnTaiDLBTPTheoThung_Click(
            object sender,
            EventArgs e)
        {
            string oldButtonText =
                btnTaiDLBTPTheoThung.Text;

            try
            {
                btnTaiDLBTPTheoThung.Enabled =
                    false;

                btnTaiDLBTPTheoThung.Text =
                    "Đang tải...";

                DateTime selectedDate =
                    dtbNgayLapVi.Value.Date;

                AppendLogScada(
                    "Đang lấy kết quả tạo viên sản xuất ngày " +
                    selectedDate.ToString("dd/MM/yyyy") +
                    "..."
                );

                _listChiTietBTPTheoThung =
                    await _googleSheetApiService
                        .GetChiTietBTPTheoThungByDateAsync(
                            selectedDate
                        );

                RenderChiTietBTPTheoThungGridRead(
                    _listChiTietBTPTheoThung
                );

                AppendLogScada(
                    "Đã tải " +
                    _listChiTietBTPTheoThung.Count +
                    " thùng BTP ngày " +
                    selectedDate.ToString("dd/MM/yyyy")
                );

                if (_listChiTietBTPTheoThung.Count == 0)
                {
                    MessageBox.Show(
                        "Không có dữ liệu BTP theo thùng ngày " +
                        selectedDate.ToString("dd/MM/yyyy") +
                        ".",
                        "Thông báo",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            }
            catch (Exception ex)
            {
                _listChiTietBTPTheoThung =
                    new List<ChiTietBTPTheoThungModel>();

                RenderChiTietBTPTheoThungGridRead(
                    _listChiTietBTPTheoThung
                );

                MessageBox.Show(
                    "Không tải được dữ liệu BTP theo thùng." +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada(
                    "Lỗi tải BTP theo thùng: " +
                    ex.Message
                );
            }
            finally
            {
                btnTaiDLBTPTheoThung.Enabled =
                    true;

                btnTaiDLBTPTheoThung.Text =
                    oldButtonText;
            }
        }

        private void RenderChiTietBTPTheoThungGridRead(
            List<ChiTietBTPTheoThungModel> data)
        {
            if (data == null)
            {
                data =
                    new List<ChiTietBTPTheoThungModel>();
            }

            dataGridViewBTPTheoThung.SuspendLayout();

            try
            {
                dataGridViewBTPTheoThung.DataSource =
                    null;

                dataGridViewBTPTheoThung.Rows.Clear();
                dataGridViewBTPTheoThung.Columns.Clear();

                dataGridViewBTPTheoThung.AutoGenerateColumns =
                    false;

                dataGridViewBTPTheoThung.AllowUserToAddRows =
                    false;

                dataGridViewBTPTheoThung.AllowUserToDeleteRows =
                    false;

                dataGridViewBTPTheoThung.ReadOnly =
                    true;

                dataGridViewBTPTheoThung.MultiSelect =
                    false;

                dataGridViewBTPTheoThung.SelectionMode =
                    DataGridViewSelectionMode.FullRowSelect;

                dataGridViewBTPTheoThung.RowHeadersVisible =
                    false;

                dataGridViewBTPTheoThung.AutoSizeRowsMode =
                    DataGridViewAutoSizeRowsMode.AllCells;

                dataGridViewBTPTheoThung.DefaultCellStyle.WrapMode =
                    DataGridViewTriState.True;

                dataGridViewBTPTheoThung.AlternatingRowsDefaultCellStyle.BackColor =
                    Color.FromArgb(
                        240,
                        240,
                        240
                    );

                /*
                 * Cột STT hiển thị trên grid.
                 */
                DataGridViewTextBoxColumn colSTT =
                    new DataGridViewTextBoxColumn();

                colSTT.Name =
                    "colSTTBTPTheoThung";

                colSTT.HeaderText =
                    "STT";

                colSTT.Width =
                    55;

                colSTT.ReadOnly =
                    true;

                colSTT.SortMode =
                    DataGridViewColumnSortMode.NotSortable;

                dataGridViewBTPTheoThung.Columns.Add(
                    colSTT
                );

                /*
                 * IdBanThanhPham.
                 */
                DataGridViewTextBoxColumn colIdBanThanhPham =
                    new DataGridViewTextBoxColumn();

                colIdBanThanhPham.Name =
                    "colIdBanThanhPhamBTPTheoThung";

                colIdBanThanhPham.HeaderText =
                    "ID bán thành phẩm";

                colIdBanThanhPham.DataPropertyName =
                    "IdBanThanhPham";

                colIdBanThanhPham.Width =
                    180;

                dataGridViewBTPTheoThung.Columns.Add(
                    colIdBanThanhPham
                );

                /*
                 * Ngày sản xuất nguyên gốc.
                 */
                DataGridViewTextBoxColumn colNgaySanXuat =
                    new DataGridViewTextBoxColumn();

                colNgaySanXuat.Name =
                    "colNgaySanXuatBTPTheoThung";

                colNgaySanXuat.HeaderText =
                    "Ngày sản xuất";

                colNgaySanXuat.DataPropertyName =
                    "NgaySanXuat";

                colNgaySanXuat.Width =
                    180;

                dataGridViewBTPTheoThung.Columns.Add(
                    colNgaySanXuat
                );

                /*
                 * IdThungBanThanhPham.
                 */
                DataGridViewTextBoxColumn colIdThung =
                    new DataGridViewTextBoxColumn();

                colIdThung.Name =
                    "colIdThungBanThanhPham";

                colIdThung.HeaderText =
                    "ID thùng BTP";

                colIdThung.DataPropertyName =
                    "IdThungBanThanhPham";

                colIdThung.Width =
                    180;

                dataGridViewBTPTheoThung.Columns.Add(
                    colIdThung
                );

                /*
                 * STT thùng trong dữ liệu.
                 */
                DataGridViewTextBoxColumn colSttThung =
                    new DataGridViewTextBoxColumn();

                colSttThung.Name =
                    "colSttThungBTPTheoThung";

                colSttThung.HeaderText =
                    "STT thùng";

                colSttThung.DataPropertyName =
                    "SttThung";

                colSttThung.Width =
                    90;

                colSttThung.DefaultCellStyle.Alignment =
                    DataGridViewContentAlignment.MiddleCenter;

                dataGridViewBTPTheoThung.Columns.Add(
                    colSttThung
                );

                /*
                 * Khối lượng thùng.
                 */
                DataGridViewTextBoxColumn colKhoiLuong =
                    new DataGridViewTextBoxColumn();

                colKhoiLuong.Name =
                    "colKhoiLuongThungBTPTheoThung";

                colKhoiLuong.HeaderText =
                    "Khối lượng thùng";

                colKhoiLuong.DataPropertyName =
                    "KhoiLuongThung";

                colKhoiLuong.Width =
                    130;

                colKhoiLuong.DefaultCellStyle.Alignment =
                    DataGridViewContentAlignment.MiddleRight;

                colKhoiLuong.DefaultCellStyle.Format =
                    "0.###";

                dataGridViewBTPTheoThung.Columns.Add(
                    colKhoiLuong
                );

                /*
                 * Vị trí thùng.
                 */
                DataGridViewTextBoxColumn colViTri =
                    new DataGridViewTextBoxColumn();

                colViTri.Name =
                    "colViTriThungBTPTheoThung";

                colViTri.HeaderText =
                    "Vị trí thùng";

                colViTri.DataPropertyName =
                    "ViTriThung";

                colViTri.AutoSizeMode =
                    DataGridViewAutoSizeColumnMode.Fill;

                colViTri.MinimumWidth =
                    130;

                dataGridViewBTPTheoThung.Columns.Add(
                    colViTri
                );

                /*
                 * Gắn List vào grid.
                 */
                dataGridViewBTPTheoThung.DataSource =
                    data;

                /*
                 * Tạo STT hiển thị.
                 */
                for (int i = 0;
                    i < dataGridViewBTPTheoThung.Rows.Count;
                    i++)
                {
                    dataGridViewBTPTheoThung
                        .Rows[i]
                        .Cells["colSTTBTPTheoThung"]
                        .Value =
                        i + 1;
                }

                if (dataGridViewBTPTheoThung.Rows.Count > 0)
                {
                    dataGridViewBTPTheoThung.ClearSelection();

                    dataGridViewBTPTheoThung.Rows[0].Selected =
                        true;

                    dataGridViewBTPTheoThung.CurrentCell =
                        dataGridViewBTPTheoThung
                            .Rows[0]
                            .Cells[
                                "colIdThungBanThanhPham"
                            ];
                }
            }
            finally
            {
                dataGridViewBTPTheoThung.ResumeLayout();
            }
        }

        private void dataGridViewBTPTheoThung_CellClick(
            object sender,
            DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0)
                return;

            string idThung =
                Convert.ToString(
                    dataGridViewBTPTheoThung
                        .Rows[e.RowIndex]
                        .Cells["colIdThungBanThanhPham"]
                        .Value
                );

            ShowChiTietBTPTheoThungById(
                idThung
            );
        }

        private void ShowQrBTPDaLuu(
            string noiDungQr)
        {
            noiDungQr =
                (noiDungQr ?? "").Trim();

            if (pictureBoxQrBTPDaLuu.Image != null)
            {
                Image oldImage =
                    pictureBoxQrBTPDaLuu.Image;

                pictureBoxQrBTPDaLuu.Image =
                    null;

                oldImage.Dispose();
            }

            if (string.IsNullOrWhiteSpace(noiDungQr))
            {
                return;
            }

            try
            {
                Bitmap qr =
                    TaoAnhQrCode(
                        noiDungQr
                    );

                pictureBoxQrBTPDaLuu.SizeMode =
                    PictureBoxSizeMode.Zoom;

                pictureBoxQrBTPDaLuu.Image =
                    qr;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    ex.Message,
                    "Lỗi QR",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void txtIdThungBanThanhPham_TextChanged(
            object sender,
            EventArgs e)
        {
            ShowQrBTPDaLuu(
                txtIdThungBanThanhPham.Text
            );
        }

        private async void btnTaiDLCongDoanEpMangIn_Click(
            object sender,
            EventArgs e)
        {
            try
            {
                AppendLogScada(
                    "Đang lấy dữ liệu công đoạn ép màng in " +
                    "..."
                );

                btnTaiDLCongDoanEpMangIn.Enabled = false;

                Cursor oldCursor = Cursor;
                Cursor = Cursors.WaitCursor;

                btnTaiDLCongDoanEpMangIn.Text =
                    "Đang tải dữ liệu...";

                int soNgay =
                    LaySoNgayLocCongDoanEpMangIn();

                CongDoanEpMangInData data =
                    await _googleSheetApiService
                        .GetCongDoanEpMangInTheoSoNgayAsync(
                            soNgay
                        );

                // Lưu vào List trên Form
                _dsKeHoachLapVi =
                    data.KeHoachLapVi ??
                    new List<KeHoachLapViVTBCModel>();

                _dsChiTietBTPTheoThung =
                    data.ChiTietBTPTheoThung ??
                    new List<ChiTietBTPTheoThungModel>();

                _dsKetQuaLapVi =
                    data.KetQuaLapVi ??
                    new List<KetQuaLapViModel>();

                // Hiển thị lên DataGridView
                HienThiDuLieuCongDoanEpMangIn();

                MessageBox.Show(
                    "Tải dữ liệu "
                    + soNgay
                    + " ngày gần nhất thành công."
                    + Environment.NewLine
                    + Environment.NewLine
                    + "Kế hoạch lắp vỉ: "
                    + _dsKeHoachLapVi.Count
                    + " dòng"
                    + Environment.NewLine
                    + "Chi tiết BTP theo thùng: "
                    + _dsChiTietBTPTheoThung.Count
                    + " dòng"
                    + Environment.NewLine
                    + "Kết quả lắp vỉ: "
                    + _dsKetQuaLapVi.Count
                    + " dòng",
                    "Thông báo",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                AppendLogScada(
                    "Đã lấy dữ liệu công đoạn ép màng in "
                );

                Cursor = oldCursor;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tải được dữ liệu công đoạn ép màng in."
                    + Environment.NewLine
                    + Environment.NewLine
                    + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            finally
            {
                btnTaiDLCongDoanEpMangIn.Enabled = true;

                btnTaiDLCongDoanEpMangIn.Text =
                    "Tải dữ liệu công đoạn ép màng in";

                Cursor = Cursors.Default;
            }
        }

        private int LaySoNgayLocCongDoanEpMangIn()
        {
            string text =
                cbbChonThoiGianLoc.Text?.Trim() ?? "";

            switch (text)
            {
                case "7 ngày gần nhất":
                    return 7;

                case "15 ngày gần nhất":
                    return 15;

                case "30 ngày gần nhất":
                    return 30;

                case "45 ngày gần nhất":
                    return 45;

                case "60 ngày gần nhất":
                    return 60;

                case "Chọn số ngày cần lọc dữ liệu":
                default:
                    return 15;
            }
        }

        private void HienThiDuLieuCongDoanEpMangIn()
        {
            // Ngắt liên kết cũ trước khi gán lại
            dataGridViewKeHoachLapVi.DataSource = null;
            dataGridViewChiTietBTPTheoThung.DataSource = null;
            dataGridViewKQLapVi.DataSource = null;

            /*
             * Nếu DataGridView chưa tạo cột thủ công
             * thì để AutoGenerateColumns = true.
             */
            dataGridViewKeHoachLapVi.AutoGenerateColumns = true;

            dataGridViewChiTietBTPTheoThung.AutoGenerateColumns = true;

            dataGridViewKQLapVi.AutoGenerateColumns = true;

            // Tạo List mới để DataGridView nhận lại dữ liệu
            dataGridViewKeHoachLapVi.DataSource =
                _dsKeHoachLapVi.ToList();

            dataGridViewChiTietBTPTheoThung.DataSource =
                _dsChiTietBTPTheoThung.ToList();

            dataGridViewKQLapVi.DataSource =
                _dsKetQuaLapVi.ToList();

            DinhDangDataGridViewCongDoanEpMangIn();
        }

        private void DinhDangDataGridViewCongDoanEpMangIn()
        {
            DinhDangMotDataGridView(
                dataGridViewKeHoachLapVi
            );

            DinhDangMotDataGridView(
                dataGridViewChiTietBTPTheoThung
            );

            DinhDangMotDataGridView(
                dataGridViewKQLapVi
            );

            // Ẩn các thuộc tính phụ dùng để lọc ngày
            AnCotNeuTonTai(
                dataGridViewKeHoachLapVi,
                "ThoiGianTaoValue"
            );

            AnCotNeuTonTai(
                dataGridViewKeHoachLapVi,
                "ThoiGianXuatValue"
            );

            AnCotNeuTonTai(
                dataGridViewChiTietBTPTheoThung,
                "NgaySanXuatValue"
            );

            AnCotNeuTonTai(
                dataGridViewKQLapVi,
                "ThoiGianLuuValue"
            );

            DoiTenCot(
                dataGridViewKeHoachLapVi,
                "IdLapVi",
                "ID lắp vỉ"
            );

            DoiTenCot(
                dataGridViewKeHoachLapVi,
                "MaSanPham",
                "Mã sản phẩm"
            );

            DoiTenCot(
                dataGridViewKeHoachLapVi,
                "TenSanPham",
                "Tên sản phẩm"
            );

            DoiTenCot(
                dataGridViewKeHoachLapVi,
                "ThoiGianTao",
                "Thời gian tạo"
            );

            DoiTenCot(
                dataGridViewKeHoachLapVi,
                "TrangThai",
                "Trạng thái"
            );

            DoiTenCot(
                dataGridViewChiTietBTPTheoThung,
                "IdBanThanhPham",
                "ID bán thành phẩm"
            );

            DoiTenCot(
                dataGridViewChiTietBTPTheoThung,
                "IdThungBanThanhPham",
                "ID thùng BTP"
            );

            DoiTenCot(
                dataGridViewKQLapVi,
                "IdThungDungVi",
                "ID thùng đựng vỉ"
            );

            DoiTenCot(
                dataGridViewKQLapVi,
                "SoLuongViDaLap",
                "Số lượng vỉ đã lắp"
            );

            DoiTenCot(
                dataGridViewKQLapVi,
                "IdThungBanThanhPham1",
                "ID thùng BTP bài 1"
            );

            DoiTenCot(
                dataGridViewKQLapVi,
                "IdThungBanThanhPham2",
                "ID thùng BTP bài 2"
            );
        }

        private void DoiTenCot(
            DataGridView dgv,
            string columnName,
            string headerText)
        {
            if (dgv == null)
                return;

            if (dgv.Columns.Contains(columnName))
            {
                dgv.Columns[columnName].HeaderText =
                    headerText;
            }
        }

        private void DinhDangMotDataGridView(
            DataGridView dgv)
        {
            if (dgv == null)
                return;

            dgv.ReadOnly = true;

            dgv.AllowUserToAddRows = false;

            dgv.AllowUserToDeleteRows = false;

            dgv.AllowUserToResizeRows = false;

            dgv.MultiSelect = false;

            dgv.SelectionMode =
                DataGridViewSelectionMode.FullRowSelect;

            dgv.RowHeadersVisible = false;

            dgv.AutoSizeRowsMode =
                DataGridViewAutoSizeRowsMode.AllCells;

            /*
             * Các cột giữ chiều rộng theo nội dung.
             * Khi tổng chiều rộng lớn hơn DataGridView,
             * thanh cuộn ngang sẽ xuất hiện.
             */
            dgv.AutoSizeColumnsMode =
                DataGridViewAutoSizeColumnsMode.DisplayedCells;

            dgv.DefaultCellStyle.WrapMode =
                DataGridViewTriState.False;
        }

        private void AnCotNeuTonTai(
            DataGridView dgv,
            string columnName)
        {
            if (dgv == null)
                return;

            if (dgv.Columns.Contains(columnName))
            {
                dgv.Columns[columnName].Visible = false;
            }
        }

        private void txtIdThungViVTBC_KeyDown(
            object sender,
            KeyEventArgs e)
        {
            if (e.KeyCode != Keys.Enter)
                return;

            e.SuppressKeyPress = true;
            e.Handled = true;

            TraCuuThungViVTBC();
        }

        private void TraCuuThungViVTBC()
        {
            ClearEpPlanPrintContent();
            if (!ValidateEpPlanBox(true)) return;
            string idThungDungVi =
                txtIdThungViVTBC.Text?.Trim() ?? "";

            // Xóa kết quả cũ
            txtCacLotNoNSX.Clear();
            txtLotNoNSXCuNhat.Clear();

            XoaHighlightDataGridView(
                dataGridViewKQLapVi
            );

            XoaHighlightDataGridView(
                dataGridViewKeHoachLapVi
            );

            XoaHighlightDataGridView(
                dataGridViewChiTietBTPTheoThung
            );

            /*
             * Xóa các danh sách kết quả tìm kiếm cũ.
             */
            _dsKetQuaLapViTimDuoc =
                new List<KetQuaLapViModel>();

            _dsKeHoachLapViTimDuoc =
                new List<KeHoachLapViVTBCModel>();

            _dsChiTietBTPTheoThungTimDuoc =
                new List<ChiTietBTPTheoThungModel>();

            if (string.IsNullOrWhiteSpace(idThungDungVi))
            {
                MessageBox.Show(
                    "Vui lòng nhập hoặc quét ID thùng vỉ.",
                    "Thông báo",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                txtIdThungViVTBC.Focus();
                return;
            }

            // ==================================================
            // BƯỚC 1:
            // Tìm thùng vỉ trong dataGridViewKQLapVi
            // ==================================================
            List<DataGridViewRow> dongKQLapVi =
                TimCacDongTheoGiaTri(
                    dataGridViewKQLapVi,
                    "IdThungDungVi",
                    idThungDungVi
                );

            if (dongKQLapVi.Count == 0)
            {
                MessageBox.Show(
                    "Không tìm thấy ID thùng vỉ:" +
                    Environment.NewLine +
                    idThungDungVi,
                    "Không tìm thấy",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                txtIdThungViVTBC.SelectAll();
                txtIdThungViVTBC.Focus();
                return;
            }

            /*
             * Highlight dòng kết quả lắp vỉ.
             */
            foreach (DataGridViewRow row in dongKQLapVi)
            {
                HighlightDong(row);
            }

            /*
             * IdThungDungVi là mã duy nhất,
             * nên thông thường chỉ có một dòng.
             */
            DataGridViewRow dongKQ =
                dongKQLapVi.First();

            // ==================================================
            // BƯỚC 2:
            // Lấy trực tiếp IdLapVi và hai ID BTP
            // từ dòng dataGridViewKQLapVi
            // ==================================================
            string idLapVi =
                LayGiaTriO(
                    dongKQ,
                    "IdLapVi"
                );

            string idThungBTP1 =
                LayGiaTriO(
                    dongKQ,
                    "IdThungBanThanhPham1"
                );

            string idThungBTP2 =
                LayGiaTriO(
                    dongKQ,
                    "IdThungBanThanhPham2"
                );

            if (string.IsNullOrWhiteSpace(idLapVi))
            {
                MessageBox.Show(
                    "Dòng kết quả lắp vỉ không có IdLapVi.",
                    "Thiếu dữ liệu",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            /*
             * Tạo danh sách hai ID BTP.
             * Hàm ThemIdThungBTPNeuHopLe sẽ:
             * - bỏ qua ID rỗng;
             * - tránh ID trùng nhau.
             */
            List<string> dsIdThungBTP =
                new List<string>();

            ThemIdThungBTPNeuHopLe(
                dsIdThungBTP,
                idThungBTP1
            );

            ThemIdThungBTPNeuHopLe(
                dsIdThungBTP,
                idThungBTP2
            );

            if (dsIdThungBTP.Count == 0)
            {
                MessageBox.Show(
                    "Dòng kết quả lắp vỉ không có " +
                    "IdThungBanThanhPham1 hoặc " +
                    "IdThungBanThanhPham2.",
                    "Thiếu dữ liệu",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                return;
            }

            // ==================================================
            // BƯỚC 3:
            // dataGridViewKeHoachLapVi chỉ dùng để highlight
            // theo IdLapVi
            // ==================================================
            List<DataGridViewRow> dongKeHoach =
                TimCacDongTheoGiaTri(
                    dataGridViewKeHoachLapVi,
                    "IdLapVi",
                    idLapVi
                );

            /*
             * Không dừng toàn bộ luồng nếu không tìm thấy kế hoạch.
             *
             * Vì hai ID BTP đã lấy trực tiếp từ Kết quả lắp vỉ,
             * nên vẫn có thể tiếp tục truy xuất BTP.
             */
            foreach (DataGridViewRow row in dongKeHoach)
            {
                HighlightDong(row);
            }

            // ==================================================
            // BƯỚC 4:
            // Dùng hai ID BTP lấy trực tiếp từ Kết quả lắp vỉ
            // để tìm trong dataGridViewChiTietBTPTheoThung
            // ==================================================
            List<DataGridViewRow> cacDongBTP =
                new List<DataGridViewRow>();

            foreach (string idThungBTP in dsIdThungBTP)
            {
                List<DataGridViewRow> rows =
                    TimCacDongTheoGiaTri(
                        dataGridViewChiTietBTPTheoThung,
                        "IdThungBanThanhPham",
                        idThungBTP
                    );

                foreach (DataGridViewRow row in rows)
                {
                    if (!cacDongBTP.Contains(row))
                    {
                        cacDongBTP.Add(row);
                    }
                }
            }

            if (cacDongBTP.Count == 0)
            {
                MessageBox.Show(
                    "Không tìm thấy thông tin các thùng bán thành phẩm." +
                    Environment.NewLine +
                    Environment.NewLine +
                    "Danh sách ID cần tìm:" +
                    Environment.NewLine +
                    string.Join(
                        Environment.NewLine,
                        dsIdThungBTP
                    ),
                    "Không tìm thấy",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                /*
                 * Dù không tìm thấy BTP vẫn cuộn và highlight
                 * dòng Kết quả lắp vỉ, kế hoạch nếu có.
                 */
                CuonDenDong(
                    dataGridViewKQLapVi,
                    dongKQ
                );

                if (dongKeHoach.Count > 0)
                {
                    CuonDenDong(
                        dataGridViewKeHoachLapVi,
                        dongKeHoach.First()
                    );
                }

                return;
            }

            foreach (DataGridViewRow row in cacDongBTP)
            {
                HighlightDong(row);
            }

            // ==================================================
            // BƯỚC 5:
            // Hiển thị LotNo/ngày sản xuất
            // ==================================================
            HienThiNgaySanXuatBTP(
                cacDongBTP
            );

            // ==================================================
            // BƯỚC 6:
            // Cuộn đến các dòng tìm được
            // ==================================================
            CuonDenDong(
                dataGridViewKQLapVi,
                dongKQ
            );

            /*
             * Kế hoạch chỉ dùng để highlight.
             * Không bắt buộc phải tồn tại để tiếp tục tra cứu.
             */
            if (dongKeHoach.Count > 0)
            {
                CuonDenDong(
                    dataGridViewKeHoachLapVi,
                    dongKeHoach.First()
                );
            }

            CuonDenDong(
                dataGridViewChiTietBTPTheoThung,
                cacDongBTP.First()
            );

            // ==================================================
            // BƯỚC 7:
            // Lưu các đối tượng tìm được
            // ==================================================
            _dsKetQuaLapViTimDuoc =
                dongKQLapVi
                    .Select(row =>
                        row.DataBoundItem as KetQuaLapViModel
                    )
                    .Where(item => item != null)
                    .Distinct()
                    .ToList();

            /*
             * dataGridViewKeHoachLapVi chỉ dùng highlight,
             * nhưng vẫn lưu danh sách để chế độ hiển thị tìm kiếm
             * hoạt động như trước.
             */
            _dsKeHoachLapViTimDuoc =
                dongKeHoach
                    .Select(row =>
                        row.DataBoundItem as KeHoachLapViVTBCModel
                    )
                    .Where(item => item != null)
                    .Distinct()
                    .ToList();

            _dsChiTietBTPTheoThungTimDuoc =
                cacDongBTP
                    .Select(row =>
                        row.DataBoundItem as ChiTietBTPTheoThungModel
                    )
                    .Where(item => item != null)
                    .Distinct()
                    .ToList();

            /*
             * Nếu đang bật chế độ chỉ hiển thị kết quả tìm kiếm
             * thì hiển thị lại ba bảng.
             */
            if (rdHienThiTimKiem.Checked)
            {
                HienThiDuLieuTimKiemCongDoanEpMangIn();
            }
        }

        private void ThemIdThungBTPNeuHopLe(
            List<string> danhSach,
            string idThungBTP)
        {
            if (danhSach == null ||
                string.IsNullOrWhiteSpace(idThungBTP))
            {
                return;
            }

            string value =
                idThungBTP.Trim();

            bool daTonTai =
                danhSach.Any(x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

            if (!daTonTai)
            {
                danhSach.Add(value);
            }
        }
        private List<DataGridViewRow> TimCacDongTheoGiaTri(
            DataGridView dgv,
            string columnName,
            string value)
        {
            List<DataGridViewRow> result =
                new List<DataGridViewRow>();

            if (dgv == null ||
                string.IsNullOrWhiteSpace(columnName) ||
                string.IsNullOrWhiteSpace(value))
            {
                return result;
            }

            if (!dgv.Columns.Contains(columnName))
            {
                throw new Exception(
                    "DataGridView không có cột: "
                    + columnName
                );
            }

            string target =
                value.Trim();

            foreach (DataGridViewRow row in dgv.Rows)
            {
                if (row.IsNewRow)
                    continue;

                string cellValue =
                    Convert.ToString(
                        row.Cells[columnName].Value
                    )?.Trim() ?? "";

                if (string.Equals(
                    cellValue,
                    target,
                    StringComparison.OrdinalIgnoreCase))
                {
                    result.Add(row);
                }
            }

            return result;
        }

        private string LayGiaTriO(
            DataGridViewRow row,
            string columnName)
        {
            if (row == null ||
                row.DataGridView == null ||
                !row.DataGridView.Columns.Contains(columnName))
            {
                return "";
            }

            object value =
                row.Cells[columnName].Value;

            if (value == null ||
                value == DBNull.Value)
            {
                return "";
            }

            return Convert.ToString(value)?.Trim() ?? "";
        }

        /*private void HighlightDong(
            DataGridViewRow row)
        {
            if (row == null)
                return;

            row.DefaultCellStyle.BackColor =
                Color.Yellow;

            row.DefaultCellStyle.ForeColor =
                Color.Black;

            row.DefaultCellStyle.SelectionBackColor =
                Color.Orange;

            row.DefaultCellStyle.SelectionForeColor =
                Color.Black;

            // Đánh dấu dòng đã được tìm thấy
            row.Tag = "FOUND";

            row.Selected = true;
        }*/

        private void HighlightDong(
            DataGridViewRow row)
        {
            if (row == null)
                return;

            row.Tag = "FOUND";

            row.DefaultCellStyle.BackColor =
                Color.Yellow;

            row.DefaultCellStyle.ForeColor =
                Color.Black;

            row.DefaultCellStyle.SelectionBackColor =
                Color.Orange;

            row.DefaultCellStyle.SelectionForeColor =
                Color.Black;
        }

        private void XoaHighlightDataGridView(
            DataGridView dgv)
        {
            if (dgv == null)
                return;

            dgv.ClearSelection();

            foreach (DataGridViewRow row in dgv.Rows)
            {
                if (row.IsNewRow)
                    continue;

                row.DefaultCellStyle.BackColor =
                    Color.Empty;

                row.DefaultCellStyle.ForeColor =
                    Color.Empty;

                row.DefaultCellStyle.SelectionBackColor =
                    Color.Empty;

                row.DefaultCellStyle.SelectionForeColor =
                    Color.Empty;
            }
        }

        private void HienThiNgaySanXuatBTP(
            List<DataGridViewRow> cacDongBTP)
        {
            txtCacLotNoNSX.Clear();
            txtLotNoNSXCuNhat.Clear();

            if (cacDongBTP == null ||
                cacDongBTP.Count == 0)
            {
                return;
            }

            List<NgaySanXuatTimDuoc> dsLotNo =
                new List<NgaySanXuatTimDuoc>();

            foreach (DataGridViewRow row in cacDongBTP)
            {
                /*
                 * Vì DataGridView tự tạo cột từ Model,
                 * tên cột thường là NgaySanXuat.
                 */
                string lotNo =
                    LayGiaTriO(
                        row,
                        "NgaySanXuat"
                    );

                /*
                 * Dự phòng nếu DataGridView dùng tên
                 * đúng như cột Google Sheet.
                 */
                if (string.IsNullOrWhiteSpace(lotNo))
                {
                    lotNo =
                        LayGiaTriO(
                            row,
                            "ngaySanXuat"
                        );
                }

                if (string.IsNullOrWhiteSpace(lotNo))
                    continue;

                DateTime ngaySanXuat;
                int caSanXuat;
                int meTrongCa;

                bool parseThanhCong =
                    TryParseLotNoSanXuat(
                        lotNo,
                        out ngaySanXuat,
                        out caSanXuat,
                        out meTrongCa
                    );

                dsLotNo.Add(
                    new NgaySanXuatTimDuoc
                    {
                        GiaTriGoc = lotNo.Trim(),

                        ParseThanhCong =
                            parseThanhCong,

                        GiaTriNgay =
                            parseThanhCong
                                ? ngaySanXuat.Date
                                : DateTime.MaxValue,

                        CaSanXuat =
                            parseThanhCong
                                ? caSanXuat
                                : int.MaxValue,

                        MeTrongCa =
                            parseThanhCong
                                ? meTrongCa
                                : int.MaxValue
                    }
                );
            }

            /*
             * Loại bỏ LotNo trùng hoàn toàn.
             */
            List<NgaySanXuatTimDuoc> dsLotNoKhongTrung =
                dsLotNo
                    .GroupBy(
                        x => x.GiaTriGoc,
                        StringComparer.OrdinalIgnoreCase
                    )
                    .Select(group => group.First())
                    .ToList();

            /*
             * Hiển thị toàn bộ chuỗi gốc,
             * không format lại.
             */
            txtCacLotNoNSX.Text =
                string.Join(
                    Environment.NewLine,
                    dsLotNoKhongTrung.Select(
                        x => x.GiaTriGoc
                    )
                );

            /*
             * Thứ tự ưu tiên:
             *
             * 1. Ngày sản xuất cũ nhất.
             * 2. Nếu cùng ngày: ca nhỏ nhất.
             * 3. Nếu cùng ca: mẻ trong ca nhỏ nhất.
             */
            NgaySanXuatTimDuoc lotNoCuNhat =
                dsLotNoKhongTrung
                    .Where(x => x.ParseThanhCong)
                    .OrderBy(x => x.GiaTriNgay)
                    .ThenBy(x => x.CaSanXuat)
                    .ThenBy(x => x.MeTrongCa)
                    .FirstOrDefault();

            txtLotNoNSXCuNhat.Text =
                lotNoCuNhat == null
                    ? ""
                    : lotNoCuNhat.GiaTriGoc;
        }

        private bool TryParseNgaySanXuat(
            string text,
            out DateTime value)
        {
            value = DateTime.MinValue;

            if (string.IsNullOrWhiteSpace(text))
                return false;

            string[] formats =
            {
                "yyyy-MM-dd",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd H:mm:ss",

                "dd/MM/yyyy",
                "d/M/yyyy",
                "dd/MM/yyyy HH:mm:ss",
                "d/M/yyyy H:mm:ss",

                "MM/dd/yyyy",
                "M/d/yyyy",
                "MM/dd/yyyy HH:mm:ss",
                "M/d/yyyy H:mm:ss"
            };

            bool exactSuccess =
                DateTime.TryParseExact(
                    text.Trim(),
                    formats,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out value
                );

            if (exactSuccess)
                return true;

            return DateTime.TryParse(
                text.Trim(),
                out value
            );
        }

        private void CuonDenDong(
            DataGridView dgv,
            DataGridViewRow row)
        {
            if (dgv == null ||
                row == null ||
                row.Index < 0)
            {
                return;
            }

            try
            {
                dgv.FirstDisplayedScrollingRowIndex =
                    row.Index;
            }
            catch
            {
                // Không cần báo lỗi nếu dòng đang bị ẩn.
            }
        }

        private decimal CalculateTongKhoiLuongMeByIdMeTron(string idMeTron)
        {
            if (_dtChiTietTronLieuSanXuat_SCADA == null || _dtChiTietTronLieuSanXuat_SCADA.Rows.Count == 0)
                return 0m;

            decimal total = 0m;

            foreach (DataRow row in _dtChiTietTronLieuSanXuat_SCADA.Rows)
            {
                string rowIdMeTron = GetRowValueScada(row, "IdMeTron");

                if (!string.Equals(rowIdMeTron, idMeTron, StringComparison.OrdinalIgnoreCase))
                    continue;

                string khoiLuongText = GetRowValueScada(row, "khoiLuongThucTe");

                if (string.IsNullOrWhiteSpace(khoiLuongText))
                {
                    khoiLuongText = GetRowValueScada(row, "KhoiLuong");
                }

                total += ParseDecimalSafeScada(khoiLuongText);
            }

            return Math.Round(total, 3);
        }

        private DataTable BuildChiTietSanXuatBanThanhPhamTable()
        {

            if (_dtChiTietTronLieuSanXuat_SCADA == null || _dtChiTietTronLieuSanXuat_SCADA.Rows.Count == 0)
            {
                throw new Exception("Chưa có dữ liệu chi tiết trộn liệu sản xuất. Vui lòng bấm lấy dữ liệu sản xuất trước.");
            }

            string idMeTron = txtMaMeTron_TaoVien.Text.Trim();
            string idBanThanhPham = txtNoiDungQRBTP.Text.Trim();
            string soLuongVien = txtSoLuongVien.Text.Trim();
            string tongKhoiLuongMeInput = txtKhoiLuongMeTron.Text.Trim();

            if (string.IsNullOrWhiteSpace(idMeTron))
            {
                throw new Exception("Chưa có mã mẻ trộn.");
            }

            if (string.IsNullOrWhiteSpace(idBanThanhPham))
            {
                throw new Exception("Chưa có mã QR bán thành phẩm.");
            }

            if (string.IsNullOrWhiteSpace(soLuongVien))
            {
                throw new Exception("Chưa nhập số lượng viên.");
            }

            if (string.IsNullOrWhiteSpace(tongKhoiLuongMeInput))
            {
                throw new Exception("Chưa nhập tổng khối lượng mẻ trộn.");
            }

            decimal tongKhoiLuongMe = ParseDecimalSafeScada(tongKhoiLuongMeInput);

            if (tongKhoiLuongMe <= 0)
            {
                throw new Exception("Tổng khối lượng mẻ trộn phải lớn hơn 0.");
            }

            string tongKhoiLuongMeText = tongKhoiLuongMe.ToString("0.###", CultureInfo.InvariantCulture);

            DataTable dtSave = _dtChiTietTronLieuSanXuat_SCADA.Clone();

            EnsureColumn(dtSave, "tocDoTrungBinhMayTronNgang");
            EnsureColumn(dtSave, "tocDoTrungBinhMayTronDung");
            EnsureColumn(dtSave, "nhietDoTrungBinhMayDun1");
            EnsureColumn(dtSave, "tocDoTrungBinhMayDun1");
            EnsureColumn(dtSave, "nhietDoTrungBinhMayDun2");
            EnsureColumn(dtSave, "tocDoTrungBinhMayDun2");
            EnsureColumn(dtSave, "soLuongVien");
            EnsureColumn(dtSave, "tongKhoiLuongMe");
            EnsureColumn(dtSave, "thoiGianHoanThanh");
            EnsureColumn(dtSave, "nguoiThucHienSanXuat");
            EnsureColumn(dtSave, "IdBanThanhPham");

            string thoiGianHoanThanh = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
             
            string nguoiThucHien = (Form1.nguoiTH ?? "").Trim();

            if (string.IsNullOrWhiteSpace(nguoiThucHien))
            {
                nguoiThucHien = Environment.UserName;
            }

            foreach (DataRow sourceRow in _dtChiTietTronLieuSanXuat_SCADA.Rows)
            {
                string rowIdMeTron = GetRowValueScada(sourceRow, "IdMeTron");

                if (!string.Equals(rowIdMeTron, idMeTron, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                DataRow newRow = dtSave.NewRow();

                foreach (DataColumn col in _dtChiTietTronLieuSanXuat_SCADA.Columns)
                {
                    newRow[col.ColumnName] = sourceRow[col.ColumnName] == DBNull.Value
                        ? ""
                        : sourceRow[col.ColumnName];
                }

                newRow["tocDoTrungBinhMayTronNgang"] = _tocDoTrungBinhMayTronNgang.ToString();
                newRow["tocDoTrungBinhMayTronDung"] = _tocDoTrungBinhMayTronDung.ToString();
                newRow["nhietDoTrungBinhMayDun1"] = _nhietDoTrungBinhMayDun1.ToString();
                newRow["tocDoTrungBinhMayDun1"] = _tocDoTrungBinhMayDun1.ToString();
                newRow["nhietDoTrungBinhMayDun2"] = _nhietDoTrungBinhMayDun2.ToString();
                newRow["tocDoTrungBinhMayDun2"] = _tocDoTrungBinhMayDun2.ToString();
                newRow["soLuongVien"] = soLuongVien;
                newRow["tongKhoiLuongMe"] = tongKhoiLuongMeText;
                newRow["thoiGianHoanThanh"] = thoiGianHoanThanh;
                newRow["nguoiThucHienSanXuat"] = nguoiThucHien;
                newRow["IdBanThanhPham"] = idBanThanhPham;

                dtSave.Rows.Add(newRow);
            }

            if (dtSave.Rows.Count == 0)
            {
                throw new Exception("Không tìm thấy dòng chiTietTronLieuSanXuat nào theo IdMeTron: " + idMeTron);
            }

            return dtSave;
        }

        private void rdHienThiTimKiem_CheckedChanged(
            object sender,
            EventArgs e)
        {
            if (!rdHienThiTimKiem.Checked)
                return;

            HienThiDuLieuTimKiemCongDoanEpMangIn();
        }

        private void HienThiDuLieuTimKiemCongDoanEpMangIn()
        {
            if (_dsKeHoachLapViTimDuoc.Count == 0 &&
                _dsChiTietBTPTheoThungTimDuoc.Count == 0 &&
                _dsKetQuaLapViTimDuoc.Count == 0)
            {
                MessageBox.Show(
                    "Chưa có kết quả tìm kiếm để hiển thị.",
                    "Thông báo",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                rdHienThiTatCa.Checked = true;
                return;
            }

            dataGridViewKeHoachLapVi.DataSource = null;
            dataGridViewChiTietBTPTheoThung.DataSource = null;
            dataGridViewKQLapVi.DataSource = null;

            dataGridViewKeHoachLapVi.DataSource =
                _dsKeHoachLapViTimDuoc.ToList();

            dataGridViewChiTietBTPTheoThung.DataSource =
                _dsChiTietBTPTheoThungTimDuoc.ToList();

            dataGridViewKQLapVi.DataSource =
                _dsKetQuaLapViTimDuoc.ToList();

            DinhDangDataGridViewCongDoanEpMangIn();

            /*
             * Khi đang ở chế độ tìm kiếm,
             * toàn bộ dòng đang hiển thị đều là dòng kết quả.
             */
            HighlightTatCaDongDangHienThi(
                dataGridViewKeHoachLapVi
            );

            HighlightTatCaDongDangHienThi(
                dataGridViewChiTietBTPTheoThung
            );

            HighlightTatCaDongDangHienThi(
                dataGridViewKQLapVi
            );
        }

        private void HighlightTatCaDongDangHienThi(
            DataGridView dgv)
        {
            if (dgv == null)
                return;

            dgv.ClearSelection();

            foreach (DataGridViewRow row in dgv.Rows)
            {
                if (row.IsNewRow)
                    continue;

                row.Tag = "FOUND";

                row.DefaultCellStyle.BackColor =
                    Color.Yellow;

                row.DefaultCellStyle.ForeColor =
                    Color.Black;

                row.DefaultCellStyle.SelectionBackColor =
                    Color.Orange;

                row.DefaultCellStyle.SelectionForeColor =
                    Color.Black;
            }
        }

        private void HighlightLaiKetQuaTimKiem()
        {
            HashSet<string> dsIdLapVi =
                new HashSet<string>(
                    _dsKeHoachLapViTimDuoc
                        .Where(x =>
                            x != null &&
                            !string.IsNullOrWhiteSpace(x.IdLapVi))
                        .Select(x => x.IdLapVi.Trim()),
                    StringComparer.OrdinalIgnoreCase
                );

            HashSet<string> dsIdThungBTP =
                new HashSet<string>(
                    _dsChiTietBTPTheoThungTimDuoc
                        .Where(x =>
                            x != null &&
                            !string.IsNullOrWhiteSpace(
                                x.IdThungBanThanhPham))
                        .Select(x =>
                            x.IdThungBanThanhPham.Trim()),
                    StringComparer.OrdinalIgnoreCase
                );

            HashSet<string> dsIdThungDungVi =
                new HashSet<string>(
                    _dsKetQuaLapViTimDuoc
                        .Where(x =>
                            x != null &&
                            !string.IsNullOrWhiteSpace(
                                x.IdThungDungVi))
                        .Select(x =>
                            x.IdThungDungVi.Trim()),
                    StringComparer.OrdinalIgnoreCase
                );

            HighlightTheoGiaTri(
                dataGridViewKeHoachLapVi,
                "IdLapVi",
                dsIdLapVi
            );

            HighlightTheoGiaTri(
                dataGridViewChiTietBTPTheoThung,
                "IdThungBanThanhPham",
                dsIdThungBTP
            );

            HighlightTheoGiaTri(
                dataGridViewKQLapVi,
                "IdThungDungVi",
                dsIdThungDungVi
            );
        }

        private void HighlightTheoGiaTri(
    DataGridView dgv,
    string columnName,
    HashSet<string> dsGiaTri)
        {
            if (dgv == null)
                return;

            dgv.ClearSelection();

            foreach (DataGridViewRow row in dgv.Rows)
            {
                if (row.IsNewRow)
                    continue;

                // Trả dòng về trạng thái bình thường trước
                row.Tag = null;

                row.DefaultCellStyle.BackColor =
                    Color.Empty;

                row.DefaultCellStyle.ForeColor =
                    Color.Empty;

                row.DefaultCellStyle.SelectionBackColor =
                    Color.Empty;

                row.DefaultCellStyle.SelectionForeColor =
                    Color.Empty;

                if (!dgv.Columns.Contains(columnName))
                    continue;

                string value =
                    Convert.ToString(
                        row.Cells[columnName].Value
                    )?.Trim() ?? "";

                if (!string.IsNullOrWhiteSpace(value) &&
                    dsGiaTri.Contains(value))
                {
                    HighlightDong(row);
                }
            }
        }

        private void rdHienThiTatCa_CheckedChanged(
            object sender,
            EventArgs e)
        {
            if (!rdHienThiTatCa.Checked)
                return;

            HienThiTatCaDuLieuCongDoanEpMangIn();
        }

        private void HienThiTatCaDuLieuCongDoanEpMangIn()
        {
            dataGridViewKeHoachLapVi.DataSource = null;
            dataGridViewChiTietBTPTheoThung.DataSource = null;
            dataGridViewKQLapVi.DataSource = null;

            dataGridViewKeHoachLapVi.DataSource =
                _dsKeHoachLapVi.ToList();

            dataGridViewChiTietBTPTheoThung.DataSource =
                _dsChiTietBTPTheoThung.ToList();

            dataGridViewKQLapVi.DataSource =
                _dsKetQuaLapVi.ToList();

            DinhDangDataGridViewCongDoanEpMangIn();

            /*
             * Sau khi bind lại, DataGridView tạo các row mới,
             * vì vậy cần highlight lại các dòng đã tìm được.
             */
            HighlightLaiKetQuaTimKiem();
        }

        /*
        private void HienThiTatCaDong(
            DataGridView dgv)
        {
            dgv.SuspendLayout();

            try
            {
                foreach (DataGridViewRow row in dgv.Rows)
                {
                    if (!row.IsNewRow)
                    {
                        row.Visible = true;
                    }
                }
            }
            finally
            {
                dgv.ResumeLayout();
            }
        }*/

        private void HighlightDongBtn(
            DataGridViewRow row)
        {
            row.DefaultCellStyle.BackColor = Color.Yellow;
            row.DefaultCellStyle.ForeColor = Color.Black;

            // Đánh dấu dòng đã được tìm thấy
            row.Tag = "FOUND";

            row.Selected = true;
        }

        private void txtLotNoNSXCuNhat_TextChanged(
    object sender,
    EventArgs e)
        {
            txtNoiDungDongTrenInVi.Clear();
            txtNoiDungDongDuoiInVi.Clear();

            string lotNo = txtLotNoNSXCuNhat.Text.Trim();

            if (string.IsNullOrWhiteSpace(lotNo))
                return;

            /*
             * Định dạng:
             * NSX11072026DM2.3
             */
            Match match = Regex.Match(
                lotNo,
                @"^NSX(\d{2})(\d{2})(\d{4})DM(\d+)\.(\d+)$",
                RegexOptions.IgnoreCase
            );

            if (!match.Success)
                return;

            if (!ValidateEpPlanBox(true)) return;

            string ngay = match.Groups[1].Value;
            string thang = match.Groups[2].Value;
            string nam = match.Groups[3].Value;
            string ca = match.Groups[4].Value;

            /*
             * Dòng trên
             * NSX 11072026 DM 2
             */
            txtNoiDungDongTrenInVi.Text =
                $"NSX {ngay}{thang}{nam} DM {ca}";

            /*
             * Tính số ngày từ NSX đến hôm nay
             */
            DateTime ngaySX;

            if (!DateTime.TryParseExact(
                    ngay + thang + nam,
                    "ddMMyyyy",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out ngaySX))
            {
                return;
            }

            int soNgay =
                (DateTime.Today - ngaySX.Date).Days;

            if (soNgay < 0)
                soNgay = 0;

            /*
             * Hiển thị 2 ký tự
             * 0 -> 00
             * 9 -> 09
             * 15 -> 15
             */
            txtNoiDungDongDuoiInVi.Text =
                soNgay.ToString("00");
        }

        private void txtNSXTrenVi_TextChanged(object sender, EventArgs e)
        {
            txtNSXInTrenThung.Clear();
            txtNSXInTrenThung.Text = txtNSXTrenVi.Text;

            txtNoiDungDongDuoiThung.Clear();

            string text = txtNSXTrenVi.Text.Trim();

            if (string.IsNullOrWhiteSpace(text))
                return;

            /*
             * Định dạng:
             * NSX 11072026 DM 2
             */
            Match match = Regex.Match(
                text,
                @"^NSX\s+(\d{8})\s+DM\s+\d+$",
                RegexOptions.IgnoreCase
            );

            if (!match.Success)
                return;

            string ngayText = match.Groups[1].Value;

            DateTime ngaySanXuat;

            if (!DateTime.TryParseExact(
                    ngayText,
                    "ddMMyyyy",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out ngaySanXuat))
            {
                return;
            }

            int soNgay =
                (DateTime.Today - ngaySanXuat.Date).Days;

            if (soNgay < 0)
                soNgay = 0;

            txtNoiDungDongDuoiThung.Text =
                soNgay.ToString("00");
        }

        private async void btnLuuDuLieuInDate_Click(
            object sender,
            EventArgs e)
        {
            string oldButtonText =
                btnLuuDuLieuInDate.Text;

            try
            {
                // =========================================
                // 1. KIỂM TRA ĐÃ CHỌN LOẠI DỮ LIỆU
                // =========================================
                if (cbbLuuDL.SelectedIndex < 0)
                {
                    MessageBox.Show(
                        "Vui lòng chọn loại dữ liệu cần lưu: Vỉ hoặc Thùng.",
                        "Thiếu thông tin",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );

                    cbbLuuDL.Focus();
                    return;
                }

                /*
                 * Trong code hiện tại của bạn,
                 * Form1.nguoiTH đang được dùng làm tài khoản đăng nhập.
                 *
                 * Giá trị này nên được gán từ txtTenDangNhap
                 * tại Form1 sau khi đăng nhập thành công.
                 */
                string nguoiLuu =
                    (Form1.nguoiTH ?? "").Trim();

                if (string.IsNullOrWhiteSpace(nguoiLuu))
                {
                    MessageBox.Show(
                        "Không lấy được tên người đăng nhập.",
                        "Thiếu thông tin",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );

                    return;
                }

                btnLuuDuLieuInDate.Enabled =
                    false;

                btnLuuDuLieuInDate.Text =
                    "Đang lưu...";

                Cursor =
                    Cursors.WaitCursor;

                // =========================================
                // 2. INDEX 0: LƯU DỮ LIỆU VỈ
                // Sheet: EpMangIn
                // =========================================
                if (cbbLuuDL.SelectedIndex == 0)
                {
                    if (!ValidateEpPlanBox(true)) return;
                    var epPlanToSave = (KeHoachEpMangInModel)cbbKHEpMangIn.SelectedItem;
                    string idThungDungVi =
                        (txtIdThungViVTBC.Text ?? "")
                            .Trim();

                    string noiDungDongTren =
                        (txtNoiDungDongTrenInVi.Text ?? "")
                            .Trim();

                    string noiDungDongDuoi =
                        (txtNoiDungDongDuoiInVi.Text ?? "")
                            .Trim();

                    if (string.IsNullOrWhiteSpace(
                        idThungDungVi))
                    {
                        MessageBox.Show(
                            "Vui lòng nhập hoặc quét ID thùng đựng vỉ.",
                            "Thiếu thông tin",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );

                        txtIdThungViVTBC.Focus();
                        return;
                    }

                    if (string.IsNullOrWhiteSpace(
                        noiDungDongTren))
                    {
                        MessageBox.Show(
                            "Nội dung dòng trên in vỉ đang trống.",
                            "Thiếu thông tin",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );

                        txtNoiDungDongTrenInVi.Focus();
                        return;
                    }

                    if (string.IsNullOrWhiteSpace(
                        noiDungDongDuoi))
                    {
                        MessageBox.Show(
                            "Nội dung dòng dưới in vỉ đang trống.",
                            "Thiếu thông tin",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );

                        txtNoiDungDongDuoiInVi.Focus();
                        return;
                    }

                    string nhietDoTamTren = ReadEpMangInTextBox("txtnhietDoTamTren");
                    string nhietDoTamDuoi = ReadEpMangInTextBox("txtnhietDoTamDuoi");
                    string giaNhietGio = ReadEpMangInTextBox("txtgiaNhietGio");
                    string tocDoCat = ReadEpMangInTextBox("txtTocDoCat");

                    DateTime thoiGianLuu =
                        DateTime.Now;

                    AppendLogScada(
                        "Đang lưu dữ liệu ép màng in. " +
                        "ID thùng vỉ=" +
                        idThungDungVi
                    );

                    SaveRowsApiResponse response =
                        await _googleSheetApiService
                            .SaveEpMangInAsync(
                                idThungDungVi,
                                noiDungDongTren,
                                noiDungDongDuoi,
                                thoiGianLuu,
                                nguoiLuu,
                                nhietDoTamTren,
                                nhietDoTamDuoi,
                                giaNhietGio,
                                tocDoCat,
                                epPlanToSave.IdEpMangIn,
                                epPlanToSave.PhienBan
                            );

                    ThemDongVaoBangEpMangIn(
                        idThungDungVi,
                        noiDungDongTren,
                        noiDungDongDuoi,
                        thoiGianLuu,
                        nguoiLuu,
                        nhietDoTamTren,
                        nhietDoTamDuoi,
                        giaNhietGio,
                        tocDoCat
                    );

                    AppendLogScada(
                        "Đã lưu dữ liệu EpMangIn. " +
                        "ID thùng vỉ=" +
                        idThungDungVi +
                        ", số dòng=" +
                        response.insertedRows
                    );

                    MessageBox.Show(
                        "Đã lưu dữ liệu ép màng in thành công." +
                        Environment.NewLine +
                        Environment.NewLine +
                        "ID thùng vỉ: " +
                        idThungDungVi +
                        Environment.NewLine +
                        "Dòng trên: " +
                        noiDungDongTren +
                        Environment.NewLine +
                        "Dòng dưới: " +
                        noiDungDongDuoi +
                        Environment.NewLine +
                        "Người lưu: " +
                        nguoiLuu +
                        Environment.NewLine +
                        "Thời gian: " +
                        thoiGianLuu.ToString(
                            "dd/MM/yyyy HH:mm:ss"
                        ),
                        "Thành công",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );

                    return;
                }

                // =========================================
                // 3. INDEX 1: LƯU DỮ LIỆU THÙNG
                // Sheet: DongThung
                // =========================================
                if (cbbLuuDL.SelectedIndex == 1)
                {
                    string noiDungNSXTrenVi =
                        (txtNSXTrenVi.Text ?? "")
                            .Trim();

                    string noiDungDongTren =
                        (txtNSXInTrenThung.Text ?? "")
                            .Trim();

                    string noiDungDongDuoi =
                        (txtNoiDungDongDuoiThung.Text ?? "")
                            .Trim();

                    /*
                     * Ngày in date lấy từ textbox mới.
                     */
                    string ngayInDateVi =
                        (txtNgayInDateVi.Text ?? "")
                            .Trim();

                    if (string.IsNullOrWhiteSpace(
                        noiDungNSXTrenVi))
                    {
                        MessageBox.Show(
                            "Nội dung NSX trên vỉ đang trống.",
                            "Thiếu thông tin",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );

                        txtNSXTrenVi.Focus();
                        return;
                    }

                    if (string.IsNullOrWhiteSpace(
                        noiDungDongTren))
                    {
                        MessageBox.Show(
                            "Nội dung dòng trên in thùng đang trống.",
                            "Thiếu thông tin",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );

                        txtNSXInTrenThung.Focus();
                        return;
                    }

                    if (string.IsNullOrWhiteSpace(
                        noiDungDongDuoi))
                    {
                        MessageBox.Show(
                            "Nội dung dòng dưới in thùng đang trống.",
                            "Thiếu thông tin",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );

                        txtNoiDungDongDuoiThung.Focus();
                        return;
                    }

                    if (string.IsNullOrWhiteSpace(
                        ngayInDateVi))
                    {
                        MessageBox.Show(
                            "Ngày in date vỉ đang trống.",
                            "Thiếu thông tin",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );

                        txtNgayInDateVi.Focus();
                        return;
                    }

                    DateTime thoiGianLuu =
                        DateTime.Now;

                    AppendLogScada(
                        "Đang lưu dữ liệu đóng thùng. " +
                        "NSX trên vỉ=" +
                        noiDungNSXTrenVi +
                        ", ngày in date vỉ=" +
                        ngayInDateVi
                    );

                    SaveRowsApiResponse response =
                        await _googleSheetApiService
                            .SaveDongThungAsync(
                                noiDungNSXTrenVi,
                                noiDungDongTren,
                                noiDungDongDuoi,
                                thoiGianLuu,
                                nguoiLuu,
                                ngayInDateVi
                            );

                    ThemDongVaoBangDongThung(
                        noiDungNSXTrenVi,
                        noiDungDongTren,
                        noiDungDongDuoi,
                        thoiGianLuu,
                        nguoiLuu,
                        ngayInDateVi
                    );

                    AppendLogScada(
                        "Đã lưu dữ liệu DongThung. " +
                        "NSX trên vỉ=" +
                        noiDungNSXTrenVi +
                        ", ngày in date vỉ=" +
                        ngayInDateVi +
                        ", số dòng=" +
                        response.insertedRows
                    );

                    MessageBox.Show(
                        "Đã lưu dữ liệu đóng thùng thành công." +
                        Environment.NewLine +
                        Environment.NewLine +
                        "NSX trên vỉ: " +
                        noiDungNSXTrenVi +
                        Environment.NewLine +
                        "Dòng trên: " +
                        noiDungDongTren +
                        Environment.NewLine +
                        "Dòng dưới: " +
                        noiDungDongDuoi +
                        Environment.NewLine +
                        "Ngày in date vỉ: " +
                        ngayInDateVi +
                        Environment.NewLine +
                        "Người lưu: " +
                        nguoiLuu +
                        Environment.NewLine +
                        "Thời gian lưu: " +
                        thoiGianLuu.ToString(
                            "dd/MM/yyyy HH:mm:ss"
                        ),
                        "Thành công",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );

                    return;
                }

                /*
                 * Dự phòng trường hợp ComboBox có thêm item khác.
                 */
                MessageBox.Show(
                    "Loại dữ liệu được chọn không hợp lệ.",
                    "Thông báo",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không lưu được dữ liệu in date." +
                    Environment.NewLine +
                    Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLogScada(
                    "Lỗi lưu dữ liệu in date: " +
                    ex.Message
                );
            }
            finally
            {
                btnLuuDuLieuInDate.Enabled =
                    true;

                btnLuuDuLieuInDate.Text =
                    oldButtonText;

                Cursor =
                    Cursors.Default;
            }
        }

        /*
        private void ChiHienThiDongHighlight(
            DataGridView dgv)
        {
            dgv.SuspendLayout();

            try
            {
                foreach (DataGridViewRow row in dgv.Rows)
                {
                    if (row.IsNewRow)
                        continue;

                    row.Visible =
                        Convert.ToString(row.Tag) == "FOUND";
                }
            }
            finally
            {
                dgv.ResumeLayout();
            }
        }*/

        private void btnKetNoiCan_Click(object sender, EventArgs e)
        {
            try
            {
                ConnectAcs180FromComboBox();
                ConnectTk4sFromComboBox();

                timerReadThamSoMay.Enabled = true;

                MessageBox.Show("Đã kết nối cảm biến nhiệt độ và biến tần.");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không kết nối được CB/BT." + Environment.NewLine + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void btnKetNoiPLC_Click(object sender, EventArgs e)
        {
            string msg;

            bool ok = _plcService.Connect(0, out msg);

            MessageBox.Show(msg);

            if(ok)
            {
                timerScanPLC.Enabled = true;
            }
        }

        private void timerScanPLC_Tick(object sender, EventArgs e)
        {
            string msg;
            bool ok;

            ok = _plcService.ReadY(0, out sta_tronNgang, out msg);
            if (ok)
            {
                setStatusMay(sta_tronNgang, lblStaTronNgang);
            }
            else
            {
                AppendLogScada("Máy trộn ngang: " + msg);
            }

            ok = _plcService.ReadY(1, out sta_tronDung, out msg);
            if (ok)
            {
                setStatusMay(sta_tronDung, lblStaTronDung);
            }
            else
            {
                AppendLogScada("Máy trộn đứng: " + msg);
            }

            ok = _plcService.ReadY(2, out sta_mayCan, out msg);
            if (ok)
            {
                setStatusMay(sta_mayCan, lblStaMayCan);
            }
            else
            {
                AppendLogScada("Máy cán: " + msg);
            }

            ok = _plcService.ReadY(3, out sta_mayDun1, out msg);
            if (ok)
            {
                setStatusMay(sta_mayDun1, lblStaMayDun1);
            }
            else
            {
                AppendLogScada("Máy đùn 1: " + msg);
            }

            ok = _plcService.ReadY(4, out sta_mayDun2, out msg);
            if (ok)
            {
                setStatusMay(sta_mayDun2, lblStaMayDun2);
            }
            else
            {
                AppendLogScada("Máy đùn 2: " + msg);
            }

            ok = _plcService.ReadY(5, out sta_mayCat, out msg);
            if (ok)
            {
                setStatusMay(sta_mayCat, lblStaMayCat);
            }
            else
            {
                AppendLogScada("Máy cắt: " + msg);
            }
        }

        private void setStatusMay(bool value, Label lbl)
        {
            if (value)
            {
                lbl.Text = "Đang chạy";
                lbl.BackColor = Color.Lime;
            }
            else
            {
                lbl.Text = "Dừng";
                lbl.BackColor = Color.Red;
            }
        }
         
        private void timerReadThamSoMay_Tick(object sender, EventArgs e)
        { 


            /* Cập nhật trạng thái các giá trị máy */
            _tocDoTrungBinhMayTronNgang = Convert.ToDecimal(sum_tocdo_tronNgang / count_tocdo_tronNgang);
            _tocDoTrungBinhMayTronDung = Convert.ToDecimal(sum_tocdo_tronDung / count_tocdo_tronDung);
            _nhietDoTrungBinhMayDun1 = Convert.ToDecimal(sum_nhietdo_mayDun1 / count_nhietdo_mayDun1);
            _tocDoTrungBinhMayDun1 = Convert.ToDecimal(sum_tocdo_mayDun1 / count_tocdo_mayDun1);
            _nhietDoTrungBinhMayDun2 = Convert.ToDecimal(sum_nhietdo_mayDun2 / count_nhietdo_mayDun2);
            _tocDoTrungBinhMayDun2 = Convert.ToDecimal(sum_tocdo_mayDun2 / count_tocdo_mayDun2);
        }

        private void ConnectAcs180FromComboBox()
        {
            string com = cbbComTocDo.Text.Trim();

            if (string.IsNullOrWhiteSpace(com))
            {
                MessageBox.Show("Vui lòng chọn COM biến tần ACS180.");
                return;
            }

            _acs180Service.Connect(com);

            lblStatusToDoBT.Image = Properties.Resources.greeen;
        }

        private void ConnectTk4sFromComboBox()
        {
            string com = cbbComNhietDo.Text.Trim();

            if (string.IsNullOrWhiteSpace(com))
            {
                MessageBox.Show("Vui lòng chọn COM cảm biến nhiệt độ TK4S.");
                return;
            }

            _tk4sService.Connect(com);

            lblStatusNhietDo.Image = Properties.Resources.greeen;
        }

        private void tabPage1_Click(object sender, EventArgs e)
        {

        }

        private string ReadEpMangInTextBox(string controlName)
        {
            Control control = Controls.Find(controlName, true).FirstOrDefault();
            if (control == null)
                throw new InvalidOperationException("Không tìm thấy ô " + controlName +
                    ". Vui lòng lưu thiết kế FrmScadaMain và kiểm tra thuộc tính Name của textbox.");
            return (control.Text ?? "").Trim();
        }

        private void btnTaiKHEpMangIn_Click_1(object sender, EventArgs e)
        {

        }

        private void ThemDongVaoBangEpMangIn(
    string idThungDungVi,
    string noiDungDongTren,
    string noiDungDongDuoi,
    DateTime thoiGianLuu,
    string nguoiLuu,
    string nhietDoTamTren,
    string nhietDoTamDuoi,
    string giaNhietGio,
    string tocDoCat)
        {
            if (_dtDLEpMangIn == null)
            {
                KhoiTaoBangEpMangIn();
            }

            int stt =
                _dtDLEpMangIn.Rows.Count + 1;

            _dtDLEpMangIn.Rows.Add(
                stt,
                idThungDungVi,
                noiDungDongTren,
                noiDungDongDuoi,
                thoiGianLuu.ToString(
                    "dd/MM/yyyy HH:mm:ss"
                ),
                nguoiLuu,
                nhietDoTamTren,
                nhietDoTamDuoi,
                giaNhietGio,
                tocDoCat
            );

            if (
                dataGridViewDLEpMangIn.Rows.Count >
                0
            )
            {
                int lastRowIndex =
                    dataGridViewDLEpMangIn
                        .Rows.Count - 1;

                dataGridViewDLEpMangIn
                    .ClearSelection();

                dataGridViewDLEpMangIn
                    .Rows[lastRowIndex]
                    .Selected = true;

                dataGridViewDLEpMangIn
                    .CurrentCell =
                    dataGridViewDLEpMangIn
                        .Rows[lastRowIndex]
                        .Cells["IdThungDungVi"];

                try
                {
                    dataGridViewDLEpMangIn
                        .FirstDisplayedScrollingRowIndex =
                        lastRowIndex;
                }
                catch
                {
                    // Không cần xử lý nếu chưa thể cuộn.
                }
            }
        }

        private void ThemDongVaoBangDongThung(
            string noiDungNSXTrenVi,
            string noiDungDongTren,
            string noiDungDongDuoi,
            DateTime thoiGianLuu,
            string nguoiLuu,
            string ngayInDateVi)
        {
            if (_dtDLDongThung == null)
            {
                KhoiTaoBangDongThung();
            }

            int stt =
                _dtDLDongThung.Rows.Count + 1;

            _dtDLDongThung.Rows.Add(
                stt,
                noiDungNSXTrenVi,
                noiDungDongTren,
                noiDungDongDuoi,
                thoiGianLuu.ToString(
                    "dd/MM/yyyy HH:mm:ss"
                ),
                nguoiLuu,
                ngayInDateVi
            );

            if (
                dataGridViewDLDongThung.Rows.Count >
                0
            )
            {
                int lastRowIndex =
                    dataGridViewDLDongThung
                        .Rows.Count - 1;

                dataGridViewDLDongThung
                    .ClearSelection();

                dataGridViewDLDongThung
                    .Rows[lastRowIndex]
                    .Selected = true;

                dataGridViewDLDongThung
                    .CurrentCell =
                    dataGridViewDLDongThung
                        .Rows[lastRowIndex]
                        .Cells["noiDungNSXTrenVi"];

                try
                {
                    dataGridViewDLDongThung
                        .FirstDisplayedScrollingRowIndex =
                        lastRowIndex;
                }
                catch
                {
                    // Không cần xử lý nếu chưa thể cuộn.
                }
            }
        }

        private string GetIdBanThanhPhamByIdThung(string idThungBanThanhPham)
        {
            idThungBanThanhPham = (idThungBanThanhPham ?? "").Trim();

            if (string.IsNullOrWhiteSpace(idThungBanThanhPham))
                return "";

            if (_dtChiTietBTPtheoThung_DaLuu == null || _dtChiTietBTPtheoThung_DaLuu.Rows.Count == 0)
                return "";

            foreach (DataRow row in _dtChiTietBTPtheoThung_DaLuu.Rows)
            {
                string idThung = Convert.ToString(row["IdThungBanThanhPham"])?.Trim() ?? "";

                if (string.Equals(idThung, idThungBanThanhPham, StringComparison.OrdinalIgnoreCase))
                {
                    return Convert.ToString(row["IdBanThanhPham"])?.Trim() ?? "";
                }
            }

            return "";
        }

        private string GetTenBaiLieuByIdBanThanhPham(string idBanThanhPham)
        {
            idBanThanhPham = (idBanThanhPham ?? "").Trim();

            if (string.IsNullOrWhiteSpace(idBanThanhPham))
                return "";

            if (_dtChiTietSanXuatBanThanhPham_DaLuu == null || _dtChiTietSanXuatBanThanhPham_DaLuu.Rows.Count == 0)
                return "";

            foreach (DataRow row in _dtChiTietSanXuatBanThanhPham_DaLuu.Rows)
            {
                if (!row.Table.Columns.Contains("IdBanThanhPham"))
                    continue;

                string idBtp = Convert.ToString(row["IdBanThanhPham"])?.Trim() ?? "";

                if (string.Equals(idBtp, idBanThanhPham, StringComparison.OrdinalIgnoreCase))
                {
                    if (row.Table.Columns.Contains("tenBaiLieu"))
                        return Convert.ToString(row["tenBaiLieu"])?.Trim() ?? "";
                }
            }

            return "";
        }

        private string FormatNgaySanXuatFromLot(string lotNo)
        {
            lotNo = (lotNo ?? "").Trim();

            if (string.IsNullOrWhiteSpace(lotNo))
                return "";

            // Ví dụ: NSX09072026DM1.2
            // Tách 09072026 thành 09/07/2026
            int nsxIndex = lotNo.IndexOf("NSX", StringComparison.OrdinalIgnoreCase);

            if (nsxIndex >= 0)
            {
                int start = nsxIndex + 3;

                if (lotNo.Length >= start + 8)
                {
                    string dateText = lotNo.Substring(start, 8);

                    if (dateText.Length == 8)
                    {
                        string dd = dateText.Substring(0, 2);
                        string mm = dateText.Substring(2, 2);
                        string yyyy = dateText.Substring(4, 4);

                        return dd + "/" + mm + "/" + yyyy;
                    }
                }
            }

            return lotNo;
        }

        private string GetThongTinInTenBaiLieu(string idThungBanThanhPham)
        {
            string idBanThanhPham = GetIdBanThanhPhamByIdThung(idThungBanThanhPham);
            string tenBaiLieu = GetTenBaiLieuByIdBanThanhPham(idBanThanhPham);

            if (!string.IsNullOrWhiteSpace(tenBaiLieu))
                return tenBaiLieu;

            return txtTenBaiLieu_Scada.Text.Trim();
        }

        private void DrawQrBtpPrintPage(
            Graphics g,
            Rectangle marginBounds,
            string idThung,
            string tenBaiLieu,
            string ngaySanXuat,
            string lotNo,
            string khoiLuongThung)
        {
            g.Clear(Color.White);

            using (Font fontTitle = new Font("Arial", 9, FontStyle.Bold))
            using (Font fontNormal = new Font("Arial", 8, FontStyle.Regular))
            using (Font fontSmall = new Font("Arial", 7, FontStyle.Regular))
            using (Font fontDate = new Font("Arial", 11, FontStyle.Bold))
            using (Brush brush = new SolidBrush(Color.Black))
            {
                int x = marginBounds.Left;
                int y = marginBounds.Top;

                int pageWidth = marginBounds.Width;

                int qrSize = Math.Min(300, pageWidth);
                int qrX = x + (pageWidth - qrSize) / 2;

                Image qrImage = null;

                if (ptbQRBTP.Image != null)
                {
                    qrImage = ptbQRBTP.Image;
                }
                else
                {
                    qrImage = TaoAnhQrCode(idThung);
                }

                if (qrImage != null)
                {
                    g.DrawImage(qrImage, new Rectangle(qrX, y, qrSize, qrSize));
                }

                y += qrSize + 6;

                DrawCenteredText(g, "QR THÙNG BTP", fontTitle, brush, x, y, pageWidth);
                y += 18;

                DrawCenteredText(g, idThung, fontSmall, brush, x, y, pageWidth);
                y += 22;

                DrawWrappedText(g, tenBaiLieu, fontNormal, brush, x, ref y, pageWidth);
                y += 2;

                DrawCenteredText(g, "Lot: " + lotNo, fontNormal, brush, x, y, pageWidth);
                y += 20;

                DrawCenteredText(g, "KL thùng: " + khoiLuongThung + " kg", fontTitle, brush, x, y, pageWidth);
                y += (int)Math.Ceiling(g.MeasureString("KL thùng: " + khoiLuongThung + " kg", fontTitle).Height) + 4;
                               
                DrawCenteredText(g, "NSX: " + ngaySanXuat, fontDate, brush, x, y, pageWidth);
                y += 24;
            }
        }

        private void DrawCenteredText(
            Graphics g,
            string text,
            Font font,
            Brush brush,
            int x,
            int y,
            int width)
        {
            text = text ?? "";

            SizeF size = g.MeasureString(text, font);
            float textX = x + (width - size.Width) / 2f;

            g.DrawString(text, font, brush, textX, y);
        }

        private void DrawWrappedText(
            Graphics g,
            string text,
            Font font,
            Brush brush,
            int x,
            ref int y,
            int width)
        {
            text = text ?? "";

            RectangleF rect = new RectangleF(x, y, width, 50);

            StringFormat format = new StringFormat();
            format.Alignment = StringAlignment.Near;
            format.LineAlignment = StringAlignment.Near;
            format.Trimming = StringTrimming.Word;

            g.DrawString(text, font, brush, rect, format);

            SizeF size = g.MeasureString(text, font, width);
            y += (int)Math.Ceiling(size.Height);
        }

        private void RenderKetQuaLapViGrid(
            List<KetQuaLapViModel> list)
        {
            if (list == null)
            {
                list = new List<KetQuaLapViModel>();
            }

            /*
             * Ngắt DataSource cũ trước khi tạo lại cột.
             */
            dataGridViewKetQuaLapVi.DataSource = null;

            /*
             * Vì tự tạo cột bằng code nên không cho tự sinh cột.
             */
            dataGridViewKetQuaLapVi.AutoGenerateColumns = false;

            dataGridViewKetQuaLapVi.Columns.Clear();

            /*
             * Không dùng Fill.
             *
             * Fill sẽ ép tất cả cột vừa đúng khung,
             * khiến cột ID bị quá nhỏ.
             *
             * None cho phép đặt Width riêng từng cột
             * và xuất hiện thanh cuộn ngang.
             */
            dataGridViewKetQuaLapVi.AutoSizeColumnsMode =
                DataGridViewAutoSizeColumnsMode.None;

            /*
             * Hiện cả thanh cuộn ngang và dọc.
             */
            dataGridViewKetQuaLapVi.ScrollBars =
                ScrollBars.Both;

            /*
             * Không tự xuống dòng.
             */
            dataGridViewKetQuaLapVi.DefaultCellStyle.WrapMode =
                DataGridViewTriState.False;

            dataGridViewKetQuaLapVi.ColumnHeadersDefaultCellStyle.WrapMode =
                DataGridViewTriState.False;

            /*
             * Không tự tăng chiều cao dòng theo nội dung.
             */
            dataGridViewKetQuaLapVi.AutoSizeRowsMode =
                DataGridViewAutoSizeRowsMode.None;

            dataGridViewKetQuaLapVi.RowTemplate.Height = 28;

            // ============================================
            // CỘT STT
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colKetQuaLapViSTT",
                    HeaderText = "STT",
                    DataPropertyName = "STT",
                    Width = 60,
                    MinimumWidth = 50,
                    SortMode =
                        DataGridViewColumnSortMode.NotSortable
                }
            );

            // ============================================
            // ID THÙNG ĐỰNG VỈ
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colIdThungDungVi",
                    HeaderText = "ID thùng vỉ",
                    DataPropertyName = "IdThungDungVi",
                    Width = 280,
                    MinimumWidth = 180
                }
            );

            // ============================================
            // ID KẾ HOẠCH LẮP VỈ
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colIdLapVi",
                    HeaderText = "ID lắp vỉ",
                    DataPropertyName = "IdLapVi",
                    Width = 260,
                    MinimumWidth = 180
                }
            );

            // ============================================
            // ID BTP BÀI 1
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colIdThungBanThanhPham1",
                    HeaderText = "ID thùng BTP bài 1",
                    DataPropertyName = "IdThungBanThanhPham1",
                    Width = 280,
                    MinimumWidth = 200
                }
            );

            // ============================================
            // ID BTP BÀI 2
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colIdThungBanThanhPham2",
                    HeaderText = "ID thùng BTP bài 2",
                    DataPropertyName = "IdThungBanThanhPham2",
                    Width = 280,
                    MinimumWidth = 200
                }
            );

            // ============================================
            // SỐ LƯỢNG VỈ
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colSoLuongViDaLap",
                    HeaderText = "Số lượng vỉ",
                    DataPropertyName = "SoLuongViDaLap",
                    Width = 120,
                    MinimumWidth = 100
                }
            );

            // ============================================
            // NGÀY SẢN XUẤT
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colNgaySanXuatLapVi",
                    HeaderText = "Ngày sản xuất",
                    DataPropertyName = "NgaySanXuat",
                    Width = 135,
                    MinimumWidth = 110
                }
            );

            // ============================================
            // THỜI GIAN LƯU
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colThoiGianLuuLapVi",
                    HeaderText = "Thời gian lưu",
                    DataPropertyName = "ThoiGianLuu",
                    Width = 170,
                    MinimumWidth = 140
                }
            );

            // ============================================
            // NGƯỜI LƯU
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colNguoiLuuLapVi",
                    HeaderText = "Người lưu",
                    DataPropertyName = "NguoiLuu",
                    Width = 130,
                    MinimumWidth = 100
                }
            );

            // ============================================
            // VỊ TRÍ KHO
            // ============================================
            dataGridViewKetQuaLapVi.Columns.Add(
                new DataGridViewTextBoxColumn
                {
                    Name = "colViTriKhoLapVi",
                    HeaderText = "Vị trí kho",
                    DataPropertyName = "ViTriKho",
                    Width = 180,
                    MinimumWidth = 120
                }
            );

            /*
             * Sắp xếp trước khi đánh STT.
             */
            List<KetQuaLapViModel> sortedList =
                list
                    .OrderByDescending(item =>
                        item.ThoiGianLuuValue ??
                        DateTime.MinValue
                    )
                    .ThenBy(item =>
                        item.IdThungDungVi
                    )
                    .ToList();

            /*
             * Vì model không có STT nên tạo danh sách hiển thị riêng.
             *
             * Quan trọng:
             * Phải đưa IdThungBanThanhPham1 và
             * IdThungBanThanhPham2 vào anonymous object.
             *
             * Nếu không có hai dòng này thì cột trên grid sẽ trống,
             * dù dữ liệu trong model vẫn có.
             */
            var displayList =
                sortedList
                    .Select(
                        (item, index) => new
                        {
                            STT =
                                index + 1,

                            IdThungDungVi =
                                item.IdThungDungVi ?? "",

                            IdLapVi =
                                item.IdLapVi ?? "",

                            IdThungBanThanhPham1 =
                                item.IdThungBanThanhPham1 ?? "",

                            IdThungBanThanhPham2 =
                                item.IdThungBanThanhPham2 ?? "",

                            SoLuongViDaLap =
                                item.SoLuongViDaLap,

                            NgaySanXuat =
                                item.NgaySanXuat ?? "",

                            ThoiGianLuu =
                                item.ThoiGianLuu ?? "",

                            NguoiLuu =
                                item.NguoiLuu ?? "",

                            ViTriKho =
                                item.ViTriKho ?? ""
                        }
                    )
                    .ToList();

            /*
             * Gán dữ liệu sau khi đã tạo đầy đủ cột.
             */
            dataGridViewKetQuaLapVi.DataSource =
                displayList;

            // ============================================
            // THIẾT LẬP CHUNG
            // ============================================
            dataGridViewKetQuaLapVi.ReadOnly = true;

            dataGridViewKetQuaLapVi.AllowUserToAddRows =
                false;

            dataGridViewKetQuaLapVi.AllowUserToDeleteRows =
                false;

            dataGridViewKetQuaLapVi.AllowUserToResizeRows =
                false;

            /*
             * Cho phép người dùng kéo rộng/hẹp cột.
             */
            dataGridViewKetQuaLapVi.AllowUserToResizeColumns =
                true;

            dataGridViewKetQuaLapVi.MultiSelect =
                false;

            dataGridViewKetQuaLapVi.SelectionMode =
                DataGridViewSelectionMode.FullRowSelect;

            dataGridViewKetQuaLapVi.RowHeadersVisible =
                false;

            /*
             * Không tự ép cột theo nội dung hoặc theo khung.
             */
            foreach (DataGridViewColumn column
                in dataGridViewKetQuaLapVi.Columns)
            {
                column.AutoSizeMode =
                    DataGridViewAutoSizeColumnMode.None;

                column.DefaultCellStyle.WrapMode =
                    DataGridViewTriState.False;
            }

            /*
             * Căn giữa một số cột ngắn.
             */
            dataGridViewKetQuaLapVi
                .Columns["colKetQuaLapViSTT"]
                .DefaultCellStyle.Alignment =
                    DataGridViewContentAlignment.MiddleCenter;

            dataGridViewKetQuaLapVi
                .Columns["colSoLuongViDaLap"]
                .DefaultCellStyle.Alignment =
                    DataGridViewContentAlignment.MiddleCenter;

            dataGridViewKetQuaLapVi
                .Columns["colNgaySanXuatLapVi"]
                .DefaultCellStyle.Alignment =
                    DataGridViewContentAlignment.MiddleCenter;

            /*
             * Nếu có dữ liệu thì tự chọn dòng đầu.
             */
            if (dataGridViewKetQuaLapVi.Rows.Count > 0)
            {
                dataGridViewKetQuaLapVi.ClearSelection();

                DataGridViewRow firstRow =
                    dataGridViewKetQuaLapVi.Rows[0];

                firstRow.Selected = true;

                dataGridViewKetQuaLapVi.CurrentCell =
                    firstRow.Cells[
                        "colIdThungDungVi"
                    ];

                string idThungDungVi =
                    Convert.ToString(
                        firstRow.Cells[
                            "colIdThungDungVi"
                        ].Value
                    );

                ShowKetQuaLapViDetailById(
                    idThungDungVi
                );
            }
            else
            {
                ClearKetQuaLapViDetail();
            }
        }

        private void KhoiTaoBangDuLieuInDate()
        {
            KhoiTaoBangEpMangIn();
            KhoiTaoBangDongThung();
        }

        private void KhoiTaoBangEpMangIn()
        {
            _dtDLEpMangIn =
                new DataTable();

            _dtDLEpMangIn.Columns.Add(
                "STT",
                typeof(int)
            );

            _dtDLEpMangIn.Columns.Add(
                "IdThungDungVi",
                typeof(string)
            );

            _dtDLEpMangIn.Columns.Add(
                "noiDungDongTren",
                typeof(string)
            );

            _dtDLEpMangIn.Columns.Add(
                "noiDungDongDuoi",
                typeof(string)
            );

            _dtDLEpMangIn.Columns.Add(
                "thoiGianLuu",
                typeof(string)
            );

            _dtDLEpMangIn.Columns.Add(
                "nguoiLuu",
                typeof(string)
            );

            _dtDLEpMangIn.Columns.Add("nhietDoTamTren", typeof(string));
            _dtDLEpMangIn.Columns.Add("nhietDoTamDuoi", typeof(string));
            _dtDLEpMangIn.Columns.Add("giaNhietGio", typeof(string));
            _dtDLEpMangIn.Columns.Add("TocDoCat", typeof(string));

            dataGridViewDLEpMangIn.AutoGenerateColumns =
                true;

            dataGridViewDLEpMangIn.DataSource =
                _dtDLEpMangIn;

            DinhDangDataGridViewDLEpMangIn();
        }

        private void KhoiTaoBangDongThung()
        {
            _dtDLDongThung =
                new DataTable();

            _dtDLDongThung.Columns.Add(
                "STT",
                typeof(int)
            );

            _dtDLDongThung.Columns.Add(
                "noiDungNSXTrenVi",
                typeof(string)
            );

            _dtDLDongThung.Columns.Add(
                "noiDungDongTren",
                typeof(string)
            );

            _dtDLDongThung.Columns.Add(
                "noiDungDongDuoi",
                typeof(string)
            );

            _dtDLDongThung.Columns.Add(
                "thoiGianLuu",
                typeof(string)
            );

            _dtDLDongThung.Columns.Add(
                "nguoiLuu",
                typeof(string)
            );

            _dtDLDongThung.Columns.Add(
                "ngayInDateVi",
                typeof(string)
            );

            dataGridViewDLDongThung.AutoGenerateColumns =
                true;

            dataGridViewDLDongThung.DataSource =
                _dtDLDongThung;

            DinhDangDataGridViewDLDongThung();
        }

        private void DinhDangDataGridViewDLEpMangIn()
        {
            DataGridView dgv =
                dataGridViewDLEpMangIn;

            if (dgv == null)
                return;

            dgv.ReadOnly =
                true;

            dgv.AllowUserToAddRows =
                false;

            dgv.AllowUserToDeleteRows =
                false;

            dgv.AllowUserToResizeRows =
                false;

            dgv.MultiSelect =
                false;

            dgv.SelectionMode =
                DataGridViewSelectionMode.FullRowSelect;

            dgv.RowHeadersVisible =
                false;

            dgv.AutoSizeRowsMode =
                DataGridViewAutoSizeRowsMode.AllCells;

            dgv.DefaultCellStyle.WrapMode =
                DataGridViewTriState.True;

            dgv.AutoSizeColumnsMode =
                DataGridViewAutoSizeColumnsMode.DisplayedCells;

            dgv.AlternatingRowsDefaultCellStyle.BackColor =
                Color.FromArgb(
                    240,
                    240,
                    240
                );

            DoiTenCot(
                dgv,
                "STT",
                "STT"
            );

            DoiTenCot(
                dgv,
                "IdThungDungVi",
                "ID thùng đựng vỉ"
            );

            DoiTenCot(
                dgv,
                "noiDungDongTren",
                "Nội dung dòng trên"
            );

            DoiTenCot(
                dgv,
                "noiDungDongDuoi",
                "Nội dung dòng dưới"
            );

            DoiTenCot(
                dgv,
                "thoiGianLuu",
                "Thời gian lưu"
            );

            DoiTenCot(
                dgv,
                "nguoiLuu",
                "Người lưu"
            );

            if (dgv.Columns.Contains("STT"))
            {
                dgv.Columns["STT"].Width =
                    55;

                dgv.Columns["STT"]
                    .DefaultCellStyle
                    .Alignment =
                    DataGridViewContentAlignment.MiddleCenter;
            }

            if (dgv.Columns.Contains(
                "IdThungDungVi"))
            {
                dgv.Columns[
                    "IdThungDungVi"
                ].Width = 220;
            }

            if (dgv.Columns.Contains(
                "noiDungDongTren"))
            {
                dgv.Columns[
                    "noiDungDongTren"
                ].Width = 220;
            }

            if (dgv.Columns.Contains(
                "noiDungDongDuoi"))
            {
                dgv.Columns[
                    "noiDungDongDuoi"
                ].Width = 180;
            }

            if (dgv.Columns.Contains(
                "thoiGianLuu"))
            {
                dgv.Columns[
                    "thoiGianLuu"
                ].Width = 160;
            }
        }

        private void DinhDangDataGridViewDLDongThung()
        {
            DataGridView dgv =
                dataGridViewDLDongThung;

            if (dgv == null)
                return;

            dgv.ReadOnly =
                true;

            dgv.AllowUserToAddRows =
                false;

            dgv.AllowUserToDeleteRows =
                false;

            dgv.AllowUserToResizeRows =
                false;

            dgv.MultiSelect =
                false;

            dgv.SelectionMode =
                DataGridViewSelectionMode.FullRowSelect;

            dgv.RowHeadersVisible =
                false;

            dgv.AutoSizeRowsMode =
                DataGridViewAutoSizeRowsMode.AllCells;

            dgv.DefaultCellStyle.WrapMode =
                DataGridViewTriState.True;

            dgv.AutoSizeColumnsMode =
                DataGridViewAutoSizeColumnsMode.DisplayedCells;

            dgv.AlternatingRowsDefaultCellStyle.BackColor =
                Color.FromArgb(
                    240,
                    240,
                    240
                );

            DoiTenCot(
                dgv,
                "STT",
                "STT"
            );

            DoiTenCot(
                dgv,
                "noiDungNSXTrenVi",
                "Nội dung NSX trên vỉ"
            );

            DoiTenCot(
                dgv,
                "noiDungDongTren",
                "Nội dung dòng trên"
            );

            DoiTenCot(
                dgv,
                "noiDungDongDuoi",
                "Nội dung dòng dưới"
            );

            DoiTenCot(
                dgv,
                "thoiGianLuu",
                "Thời gian lưu"
            );

            DoiTenCot(
                dgv,
                "nguoiLuu",
                "Người lưu"
            );

            DoiTenCot(
                dgv,
                "ngayInDateVi",
                "Ngày in date vỉ"
            );

            if (dgv.Columns.Contains("STT"))
            {
                dgv.Columns["STT"].Width =
                    55;

                dgv.Columns["STT"]
                    .DefaultCellStyle
                    .Alignment =
                    DataGridViewContentAlignment.MiddleCenter;
            }

            if (dgv.Columns.Contains(
                "noiDungNSXTrenVi"))
            {
                dgv.Columns[
                    "noiDungNSXTrenVi"
                ].Width = 220;
            }

            if (dgv.Columns.Contains(
                "noiDungDongTren"))
            {
                dgv.Columns[
                    "noiDungDongTren"
                ].Width = 220;
            }

            if (dgv.Columns.Contains(
                "noiDungDongDuoi"))
            {
                dgv.Columns[
                    "noiDungDongDuoi"
                ].Width = 180;
            }

            if (dgv.Columns.Contains(
                "thoiGianLuu"))
            {
                dgv.Columns[
                    "thoiGianLuu"
                ].Width = 160;
            }

            if (dgv.Columns.Contains(
                "ngayInDateVi"))
            {
                dgv.Columns[
                    "ngayInDateVi"
                ].Width = 150;

                dgv.Columns[
                    "ngayInDateVi"
                ].DefaultCellStyle.Alignment =
                    DataGridViewContentAlignment.MiddleCenter;
            }

        }
        private void ShowKetQuaLapViDetailById(
            string idThungDungVi)
        {
            idThungDungVi =
                (idThungDungVi ?? "").Trim();

            if (string.IsNullOrWhiteSpace(idThungDungVi))
            {
                ClearKetQuaLapViDetail();
                return;
            }

            KetQuaLapViModel item =
                _listKetQuaLapVi.FirstOrDefault(x =>
                    string.Equals(
                        x.IdThungDungVi,
                        idThungDungVi,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

            if (item == null)
            {
                ClearKetQuaLapViDetail();
                return;
            }

            txtIdThungDungVi.Text =
                item.IdThungDungVi ?? "";

            txtIdLapVi.Text =
                item.IdLapVi ?? "";

            txtSoLuongViDaLap.Text =
                item.SoLuongViDaLap.ToString();

            txtNgaySanXuat.Text =
                FormatNgayLapViForDisplay(
                    item.NgaySanXuat
                );

            txtThoiGianLuu.Text =
                FormatThoiGianLapViForDisplay(
                    item.ThoiGianLuu
                );

            txtViTriKho.Text =
                item.ViTriKho ?? "";

            txtIdThungBanThanhPham1.Text =
                item.IdThungBanThanhPham1 ?? "";

            txtIdThungBanThanhPham2.Text =
                item.IdThungBanThanhPham2 ?? "";
        }

        private string FormatNgayLapViForDisplay(
            string value)
        {
            DateTime date;

            if (TryParseSheetDateTime(
                value,
                out date))
            {
                return date.ToString(
                    "dd/MM/yyyy"
                );
            }

            return value ?? "";
        }

        private string FormatThoiGianLapViForDisplay(
            string value)
        {
            DateTime date;

            if (TryParseSheetDateTime(
                value,
                out date))
            {
                return date.ToString(
                    "dd/MM/yyyy HH:mm:ss"
                );
            }

            return value ?? "";
        }

        private bool TryParseLotNoSanXuat(
            string lotNo,
            out DateTime ngaySanXuat,
            out int caSanXuat,
            out int meTrongCa)
        {
            ngaySanXuat = DateTime.MinValue;
            caSanXuat = int.MaxValue;
            meTrongCa = int.MaxValue;

            if (string.IsNullOrWhiteSpace(lotNo))
                return false;

            string text = lotNo.Trim();

            /*
             * Định dạng:
             * NSX11072026DM2.3
             *
             * Group 1: 11       ngày
             * Group 2: 07       tháng
             * Group 3: 2026     năm
             * Group 4: 2        ca
             * Group 5: 3        mẻ trong ca
             */
            Match match = Regex.Match(
                text,
                @"^NSX(\d{2})(\d{2})(\d{4})DM(\d+)\.(\d+)$",
                RegexOptions.IgnoreCase
            );

            if (!match.Success)
                return false;

            string dateText =
                match.Groups[1].Value +
                match.Groups[2].Value +
                match.Groups[3].Value;

            bool ngayHopLe = DateTime.TryParseExact(
                dateText,
                "ddMMyyyy",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out ngaySanXuat
            );

            if (!ngayHopLe)
                return false;

            if (!int.TryParse(
                match.Groups[4].Value,
                out caSanXuat))
            {
                return false;
            }

            if (!int.TryParse(
                match.Groups[5].Value,
                out meTrongCa))
            {
                return false;
            }

            return true;
        }

        private class NgaySanXuatTimDuoc
        {
            // Chuỗi nguyên bản, ví dụ NSX11072026DM2.3
            public string GiaTriGoc { get; set; }

            public bool ParseThanhCong { get; set; }

            // Ngày sản xuất được đọc từ ddMMyyyy
            public DateTime GiaTriNgay { get; set; }

            // a trong DMa.b
            public int CaSanXuat { get; set; }

            // b trong DMa.b
            public int MeTrongCa { get; set; }
        }
    }
}
