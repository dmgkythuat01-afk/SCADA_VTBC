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
using System.IO;

namespace CanScadaVienTreoBC
{
    public partial class Form1 : Form
    {
        public static string nguoiTH;

        private FrmScadaMain _frmScadaMain;
        private bool _dangLuuCan;
        private string PendingCanPath
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CanScadaVienTreoBC", "PendingCanNguyenLieu.xml"); }
        }


        private readonly GoogleSheetApiService _apiService = new GoogleSheetApiService();
        private List<AccountModel> _accounts = new List<AccountModel>();
         
        private readonly SqlSyncService _sqlSyncService = new SqlSyncService();
        private readonly SqlDataService _sqlDataService = new SqlDataService();
        private readonly ChiTietCanBatchService _chiTietCanBatchService = new ChiTietCanBatchService();

        private readonly GoogleSheetApiService _googleSheetApiService = new GoogleSheetApiService();

        private List<Dictionary<string, object>> _listChiTietSanXuatBanThanhPham =
            new List<Dictionary<string, object>>();

        private DataTable _dtChiTietSanXuatBanThanhPham = new DataTable(); 

        private List<Dictionary<string, object>> _listChiTietLapVi = new List<Dictionary<string, object>>();
        private DataTable _dtChiTietLapVi = new DataTable();

        private DataRowView _selectedNguyenLieuCanRow = null;
        private DataTable _dtChiTietCan = null;

        private string _selectedTenBaiLieu = "";
        private string _selectedKeHoachId = "";
        private string _selectedPhieuXuatId = "";

        private SerialPort _serialCanBan;
        private string _bufferCanBan = "";
        private readonly object _lockCanBan = new object();


        private decimal? _latestCanBanValue = null;
        private decimal? _lastShownCanBanValue = null;
        private System.Windows.Forms.Timer _timerCanBanUi = new System.Windows.Forms.Timer();

        private SerialPort _serialCan6kg;
        private SerialPort _serialCanPhanTich;

        private PrintDocument _printQrDocument = new PrintDocument();

        /* Dành cho xác nhận sản xuất */
        private DataTable _dtChiTietCanBatchRecent_SX = null;
        private DataTable _dtKeHoach_SX = null;

        private string _selectedKeHoachId_SX = "";
        private string _selectedTenBaiLieu_SX = "";

        private bool _daLoadChiTietCanBatch_SX = false;

        private DataTable _dtChiTietTronLieuSanXuatRecent_SX = null;

        private int _meTronDangThucHien_SX = 1;
        private string _idMeTronHienTai_SX = "";

        private DataRowView _selectedNguyenLieuCanRow_SX = null;
        private DataTable _dtTronLieuBatch_SX = null;

        private int _sttTronDangCho_SX = 1;

        SerialPort portCan6kg;
        SerialPort portCanPhanTich;
        bool hasSuccessCan6k = false;
        bool hasSuccessCanPhanTich = false;

        public Form1()
        {
            InitializeComponent();

            _printQrDocument.PrintPage += printQrDocument_PrintPage;

            _timerCanBanUi.Interval = 50;
            _timerCanBanUi.Tick += timerCanBanUi_Tick;
        }

        private async void Form1_Load(object sender, EventArgs e)
        {
            tabControl1.TabPages.Remove(tabPage2);
            tabControl1.Enabled = false;
            grbDieuKhienDL.Enabled = false;
            timerDateTime.Enabled = true; 
            SetupGridStyle(dgvNguyenLieuCan);
            SetupGridStyle(dgvKeHoachSanXuat);
            SetupGridStyle(dgvKeHoachSanXuat_SX);
            SetupGridStyle(dgvNguyenLieuCan_SX);
            await LoadAccountsAsync();
            if (File.Exists(PendingCanPath))
                MessageBox.Show("Có nguyên liệu đang lưu dở. Sau khi đăng nhập, bấm Xác nhận lưu cân để gửi tiếp dữ liệu đã giữ trên máy.");

            SetCanStatusImage(lblStatusCanBan, false);
            SetCanStatusImage(lblStatusCan6kg, false);
            SetCanStatusImage(lblStatusCanPhanTich, false);
            dtpChonNgaySX.Value = DateTime.Today;
            cbbSoNgay.SelectedIndex = 0;
        }

        private void timerDateTime_Tick(object sender, EventArgs e)
        {
            txtDateTime.Text = DateTime.Now.ToString();
        }

          
        private void tabControl1_DrawItem(object sender, DrawItemEventArgs e)
        {
            TabControl tab = sender as TabControl;
            if (tab == null) return;

            TabPage page = tab.TabPages[e.Index];
            bool selected = e.Index == tab.SelectedIndex;

            Rectangle rect = e.Bounds;
            rect.Inflate(-4, -4);

            Color backColor = selected
                ? Color.FromArgb(37, 99, 235)
                : Color.FromArgb(241, 245, 249);

            Color borderColor = selected
                ? Color.FromArgb(37, 99, 235)
                : Color.FromArgb(203, 213, 225);

            Color textColor = selected
                ? Color.White
                : Color.FromArgb(51, 65, 85);

            using (SolidBrush brush = new SolidBrush(backColor))
            {
                e.Graphics.FillRectangle(brush, rect);
            }

            using (Pen pen = new Pen(borderColor))
            {
                e.Graphics.DrawRectangle(pen, rect);
            }

            TextRenderer.DrawText(
                e.Graphics,
                page.Text,
                tab.Font,
                rect,
                textColor,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter
            );
        }

        private void SetupGridStyle(System.Windows.Forms.DataGridView dgv)
        {
            dgv.AutoGenerateColumns = true;
            dgv.AllowUserToAddRows = false;
            dgv.AllowUserToDeleteRows = false;
            dgv.ReadOnly = true;
            dgv.MultiSelect = false;
            dgv.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dgv.RowHeadersVisible = false;

            dgv.BackgroundColor = Color.White;
            dgv.BorderStyle = BorderStyle.None;
            dgv.GridColor = Color.FromArgb(229, 231, 235);

            dgv.EnableHeadersVisualStyles = false;

            dgv.ColumnHeadersHeight = 42;
            dgv.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(22, 163, 74);
            dgv.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            dgv.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            dgv.ColumnHeadersDefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter;

            dgv.DefaultCellStyle.BackColor = Color.White;
            dgv.DefaultCellStyle.ForeColor = Color.FromArgb(17, 24, 39);
            dgv.DefaultCellStyle.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            dgv.DefaultCellStyle.SelectionBackColor = Color.FromArgb(219, 234, 254);
            dgv.DefaultCellStyle.SelectionForeColor = Color.FromArgb(17, 24, 39);
            dgv.DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleLeft;

            dgv.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(248, 250, 252);
            dgv.AlternatingRowsDefaultCellStyle.ForeColor = Color.FromArgb(17, 24, 39);
            dgv.AlternatingRowsDefaultCellStyle.SelectionBackColor = Color.FromArgb(219, 234, 254);
            dgv.AlternatingRowsDefaultCellStyle.SelectionForeColor = Color.FromArgb(17, 24, 39);

            dgv.RowTemplate.Height = 38;
            dgv.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells;
            dgv.AutoSizeRowsMode = DataGridViewAutoSizeRowsMode.None;

            dgv.ClearSelection();
        }

        private async Task LoadAccountsAsync()
        {
            try
            {
                btnDangNhap.Enabled = false;
                txtLogThaoTac.Text = DateTime.Now.ToString("HH:mm:ss")+ " - Đang tải dữ liệu tài khoản..." + Environment.NewLine;

                _accounts = await _apiService.GetAccountsAsync();

                txtLogThaoTac.AppendText(DateTime.Now.ToString("HH:mm:ss") + " - Đã tải " + _accounts.Count + " tài khoản." + Environment.NewLine);
                btnDangNhap.Enabled = true;
            }
            catch (Exception ex)
            {
                btnDangNhap.Enabled = false;
                txtLogThaoTac.AppendText(DateTime.Now.ToString("HH:mm:ss") + " - Không tải được tài khoản.");

                MessageBox.Show(
                    "Không lấy được dữ liệu Account từ Google Sheet.\n\n" + ex.Message,
                    "Lỗi tải dữ liệu",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void btnDangNhap_Click(object sender, EventArgs e)
        {
            Login();
        }

        private void Login()
        {
            string username = txtTenDangNhap.Text.Trim();
            string password = txtMatKhau.Text.Trim();

            if (string.IsNullOrWhiteSpace(username))
            {
                MessageBox.Show("Vui lòng nhập tài khoản.", "Thông báo",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                txtTenDangNhap.Focus();
                return;
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                MessageBox.Show("Vui lòng nhập mật khẩu.", "Thông báo",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                txtMatKhau.Focus();
                return;
            }

            if (_accounts == null || _accounts.Count == 0)
            {
                MessageBox.Show("Chưa có dữ liệu tài khoản. Vui lòng kiểm tra kết nối API.", "Thông báo",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            AccountModel account = _accounts.FirstOrDefault(x =>
                string.Equals((x.useName ?? "").Trim(), username, StringComparison.OrdinalIgnoreCase)
                && (x.passWord ?? "").Trim() == password
            );

            if (account == null)
            {
                MessageBox.Show("Sai tài khoản hoặc mật khẩu.", "Đăng nhập thất bại",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                txtTenDangNhap.Focus();
                txtMatKhau.SelectAll();
                return;
            }

            string role = (account.role ?? "").Trim().ToLower();

            if (!IsAllowedRole(role))
            {
                MessageBox.Show(
                    "Tài khoản này không có quyền sử dụng phần mềm cân.\n\nRole hiện tại: " + account.role,
                    "Không có quyền",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            AppSession.CurrentUser = account;

            OpenMainForm();

            txtInforTK.Text = txtTenDangNhap.Text + " / " + role;
            nguoiTH = txtTenDangNhap.Text;

            MessageBox.Show("Đăng nhập thành công", "Thông báo",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private bool IsAllowedRole(string role)
        {
            return role == "worker"
                || role == "weighing_worker"
                || role == "adminDEV"
                || role == "admin";
        }

        private void OpenMainForm()
        {
            grbDieuKhienDL.Enabled = true;
            tabControl1.Enabled = true;
        }

        private async void btnDongBoDuLieu_Click(object sender, EventArgs e)
        {
            await SyncAllDataAsync();
        }

        private async Task SyncAllDataAsync()
        {
            try
            {
                btnDongBoDuLieu.Enabled = false;

                AppendLog("- Đang lấy toàn bộ dữ liệu từ Google Sheet...");

                JObject allData = await _apiService.GetAllDataAsync();

                AppendLog("- Đã lấy dữ liệu từ Google Sheet. Đang lưu vào SQL Server local...");

                SyncResult result = await Task.Run(() => _sqlSyncService.SyncAllData(allData));

                AppendLog("- Đồng bộ SQL Server thành công.");
                AppendLog("- Tổng dòng xử lý: " + result.TotalUpdated);

                foreach (string log in result.Logs)
                {
                    AppendLog("- " + log);
                }

                MessageBox.Show(
                    "Đồng bộ dữ liệu thành công.\nTổng dòng xử lý: " + result.TotalUpdated,
                    "Thành công",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                AppendLog("- Lỗi đồng bộ: " + ex.Message);

                MessageBox.Show(
                    "Đồng bộ dữ liệu thất bại.\n\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            finally
            {
                btnDongBoDuLieu.Enabled = true;
            }
        }

        private void AppendLog(string message)
        {
            txtLogThaoTac.AppendText(
                DateTime.Now.ToString("HH:mm:ss") + " " + message + Environment.NewLine
            );
        }

        private void LoadApprovedExportPlans()
        {
            try
            {
                DataTable dt = _sqlDataService.GetApprovedExportPlanList();
                

                txtLogThaoTac.AppendText(
                    DateTime.Now.ToString("HH:mm:ss") +
                    " - Đã tải " + dt.Rows.Count + " phiếu xuất đã duyệt từ SQL Server." +
                    Environment.NewLine
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tải được phiếu xuất từ SQL Server.\n\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
         
        private void btnLayDLSanXuat_Click(object sender, EventArgs e)
        {
            //LoadApprovedExportPlans();
            showKeHoachSanXuat();
        }

        private void showKeHoachSanXuat()
        {
            try
            {
                DateTime ngayChon = dtpChonNgaySX.Value.Date;
                DateTime homNay = DateTime.Today;

                if (ngayChon < homNay)
                {
                    MessageBox.Show(
                        "Ngày sản xuất không hợp lệ." + Environment.NewLine +
                        "Chỉ được chọn từ hôm nay, ngày mai, ngày kia trở đi." + Environment.NewLine +
                        "Không được chọn ngày hôm qua hoặc các ngày trong quá khứ.",
                        "Ngày không hợp lệ",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );

                    dgvKeHoachSanXuat.DataSource = null;
                    return;
                }

                DataTable dt = _sqlDataService.GetKeHoachSanXuatTheoNgay(ngayChon);

                dgvKeHoachSanXuat.DataSource = null;
                dgvKeHoachSanXuat.AutoGenerateColumns = false;
                dgvKeHoachSanXuat.Columns.Clear();

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colPhieuXuatId",
                    HeaderText = "Phiếu xuất",
                    DataPropertyName = "PhieuXuatId",
                    Visible = false
                });

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colKeHoachId",
                    HeaderText = "Mã kế hoạch",
                    DataPropertyName = "KeHoachId",
                    Width = 160
                });

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colTenBaiLieu",
                    HeaderText = "Tên bài liệu",
                    DataPropertyName = "tenBaiLieu",
                    AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
                });

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colSoLuong",
                    HeaderText = "Số lượng",
                    DataPropertyName = "soLuong",
                    Width = 100
                });

                dgvKeHoachSanXuat.DataSource = dt;

                btnThemDLCan.Enabled = true;
                btnXacNhanLuuCanNL.Enabled = true;

                AppendLog(
                    "- Đã tải " + dt.Rows.Count +
                    " kế hoạch sản xuất ngày " + ngayChon.ToString("dd/MM/yyyy") + "."
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tải được kế hoạch sản xuất theo ngày chọn.\n\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }


        private void LoadExportTicketDetails(string keHoachId)
        {
            try
            {
                DataTable dt = _sqlDataService.GetApprovedExportTicketsByPlan(keHoachId);
                dgvNguyenLieuCan.DataSource = dt;

                txtLogThaoTac.AppendText(
                    DateTime.Now.ToString("HH:mm:ss") +
                    " - Đã tải " + dt.Rows.Count + " nguyên liệu của kế hoạch " + keHoachId +
                    Environment.NewLine
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tải được chi tiết phiếu xuất.\n\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void showKeHoachSanXuat_2()
        {
            try
            {
                DataTable dt = _sqlDataService.GetKeHoachSanXuatHomNay();

                dgvKeHoachSanXuat.DataSource = null;
                dgvKeHoachSanXuat.AutoGenerateColumns = false;
                dgvKeHoachSanXuat.Columns.Clear();

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colPhieuXuatId",
                    HeaderText = "Phiếu xuất",
                    DataPropertyName = "PhieuXuatId",
                    Visible = false
                });

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colKeHoachId",
                    HeaderText = "Mã kế hoạch",
                    DataPropertyName = "KeHoachId",
                    Width = 160
                });

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colTenBaiLieu",
                    HeaderText = "Tên bài liệu",
                    DataPropertyName = "tenBaiLieu",
                    AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
                });

                dgvKeHoachSanXuat.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colSoLuong",
                    HeaderText = "Số lượng",
                    DataPropertyName = "soLuong",
                    Width = 100
                });

                dgvKeHoachSanXuat.DataSource = dt;

                //StyleKeHoachSanXuatGrid();

                AppendLog("- Đã tải " + dt.Rows.Count + " kế hoạch sản xuất hôm nay.");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tải được kế hoạch sản xuất hôm nay.\n\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void showNguyenLieuCan(string phieuXuatId, string tenBaiLieu)
        {
            try
            {
                DataTable dt = _sqlDataService.GetNguyenLieuCanTheoPhieuXuat(phieuXuatId, tenBaiLieu);

                dgvNguyenLieuCan.DataSource = null;
                dgvNguyenLieuCan.AutoGenerateColumns = false;
                dgvNguyenLieuCan.Columns.Clear();

                dgvNguyenLieuCan.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colIdKho",
                    HeaderText = "Id Kho",
                    DataPropertyName = "IdKho",
                    Width = 140
                });

                dgvNguyenLieuCan.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colMaNguyenLieu",
                    HeaderText = "Mã nguyên liệu",
                    DataPropertyName = "maNguyenLieu",
                    Width = 180
                });

                dgvNguyenLieuCan.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colSttTron",
                    HeaderText = "Stt trộn",
                    DataPropertyName = "sttTron",
                    Width = 90
                });

                dgvNguyenLieuCan.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colCanSuDung",
                    HeaderText = "Cân sử dụng",
                    DataPropertyName = "canSuDung",
                    Width = 130
                });

                dgvNguyenLieuCan.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colSoLuong",
                    HeaderText = "Số lượng",
                    DataPropertyName = "soLuong",
                    Width = 90
                });

                var colKhoiLuong = new DataGridViewTextBoxColumn
                {
                    Name = "colKhoiLuong",
                    HeaderText = "Khối lượng",
                    DataPropertyName = "KhoiLuong",
                    Width = 120
                };

                colKhoiLuong.DefaultCellStyle.Format = "N4";

                dgvNguyenLieuCan.Columns.Add(colKhoiLuong);

                dgvNguyenLieuCan.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colDonVi",
                    HeaderText = "Đơn vị",
                    DataPropertyName = "DonViBaiTron",
                    Width = 80
                });

                dgvNguyenLieuCan.DataSource = dt;

                //StyleNguyenLieuCanGrid();

                AppendLog("- Đã tải " + dt.Rows.Count + " nguyên liệu cần cân của bài " + tenBaiLieu + ".");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tải được danh sách nguyên liệu cần cân.\n\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void dgvKeHoachSanXuat_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0) return;

            DataGridViewRow row = dgvKeHoachSanXuat.Rows[e.RowIndex];

            string phieuXuatId = Convert.ToString(row.Cells["colPhieuXuatId"].Value);
            string keHoachId = Convert.ToString(row.Cells["colKeHoachId"].Value);
            string tenBaiLieu = Convert.ToString(row.Cells["colTenBaiLieu"].Value);

            if (string.IsNullOrWhiteSpace(phieuXuatId))
            {
                MessageBox.Show(
                    "Không lấy được PhieuXuatId của kế hoạch được chọn.",
                    "Thiếu dữ liệu",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            if (string.IsNullOrWhiteSpace(tenBaiLieu))
            {
                MessageBox.Show(
                    "Không lấy được tên bài liệu của kế hoạch được chọn.",
                    "Thiếu dữ liệu",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            _selectedPhieuXuatId = phieuXuatId;
            _selectedKeHoachId = keHoachId;
            _selectedTenBaiLieu = tenBaiLieu;

            _selectedNguyenLieuCanRow = null;
            showThongTinKeHoach(row);
            showNguyenLieuCan(phieuXuatId, tenBaiLieu);

            CapNhatTrangThaiNguyenLieuDaLuu();
            KiemTraVaKhoaNeuKeHoachDaCanBatch(phieuXuatId, keHoachId, tenBaiLieu);
            CapNhatKhoaNguyenLieuDangChon();
        }

        private void showThongTinKeHoach(DataGridViewRow row)
        {
            if (row == null) return;

            string phieuXuatId = Convert.ToString(row.Cells["colPhieuXuatId"].Value);
            string keHoachId = Convert.ToString(row.Cells["colKeHoachId"].Value);
            string tenBaiLieu = Convert.ToString(row.Cells["colTenBaiLieu"].Value);
            string soLuong = Convert.ToString(row.Cells["colSoLuong"].Value);

            string ngaySanXuat = "";
            if (row.DataBoundItem is DataRowView drv)
            {
                if (drv.Row.Table.Columns.Contains("NgaySanXuat"))
                    ngaySanXuat = Convert.ToString(drv["NgaySanXuat"]);
            }

            int tongSoLuongNguyenLieu = 0;

            if (!string.IsNullOrWhiteSpace(phieuXuatId) && !string.IsNullOrWhiteSpace(tenBaiLieu))
            {
                try
                {
                    DataTable dtNguyenLieu = _sqlDataService.GetNguyenLieuCanTheoPhieuXuat(phieuXuatId, tenBaiLieu);
                    tongSoLuongNguyenLieu = dtNguyenLieu.Rows.Count;
                }
                catch
                {
                    tongSoLuongNguyenLieu = 0;
                }
            }

            txtThongTinKeHoach.Multiline = true;
            txtThongTinKeHoach.WordWrap = true;
            txtThongTinKeHoach.ScrollBars = ScrollBars.Vertical;

            txtThongTinKeHoach.Text =
                "- Tên bài liệu: " + tenBaiLieu + Environment.NewLine +
                "- Mã kế hoạch: " + keHoachId + Environment.NewLine +
                "- Mã phiếu xuất: " + phieuXuatId + Environment.NewLine +
                "- Số lượng: " + soLuong + Environment.NewLine +
                "- Ngày sản xuất: " + ngaySanXuat + Environment.NewLine +
                "- Tổng số lượng nguyên liệu: " + tongSoLuongNguyenLieu;
        }

        private void showChiTietNguyenLieuCan(DataGridViewRow row)
        {
            if (row == null) return;

            string idKho = GetCellValue(row, "colIdKho");
            string idKhoDaTru = GetValueFromSelectedNguyenLieu("IdKhoDaTru");
            string tenNguyenLieu = GetCellValue(row, "colTenNguyenLieu");
            string sttTron = GetCellValue(row, "colSttTron");
            string canSuDung = GetCellValue(row, "colCanSuDung");
            string soLuong = GetCellValue(row, "colSoLuong");
            string khoiLuong = GetCellValue(row, "colKhoiLuong");
            string donVi = GetCellValue(row, "colDonVi");
            string maNguyenLieu = GetCellValue(row, "colMaNguyenLieu");

            txtChiTietNguyenLieuCan.Multiline = true;
            txtChiTietNguyenLieuCan.WordWrap = true;
            txtChiTietNguyenLieuCan.ScrollBars = ScrollBars.Vertical;
            txtChiTietNguyenLieuCan.ReadOnly = true;

            txtChiTietNguyenLieuCan.Text =
                "- Tên bài liệu: " + _selectedTenBaiLieu + Environment.NewLine + 
                "- Mã KH: " + _selectedKeHoachId + Environment.NewLine +
                "- Id kho đã trừ: " + FormatIdKhoDaTruForTextbox(idKhoDaTru).Replace(Environment.NewLine, ", ") + Environment.NewLine +
                "- Tên nguyên liệu: " + tenNguyenLieu + Environment.NewLine +
                "- STT trộn: " + sttTron + Environment.NewLine +
                "- Cân sử dụng: " + canSuDung + Environment.NewLine +
                "- Số lượng: " + soLuong + Environment.NewLine +
                "- Khối lượng: " + khoiLuong + Environment.NewLine +
                "- Đơn vị: " + donVi;

            if (string.IsNullOrWhiteSpace(idKhoDaTru))
            {
                idKhoDaTru = idKho;
            }

            txtIdNLKhoShow.Multiline = true;
            txtIdNLKhoShow.WordWrap = true;
            txtIdNLKhoShow.ScrollBars = ScrollBars.Vertical;
            txtIdNLKhoShow.Text = FormatIdKhoDaTruForTextbox(idKhoDaTru);

            txtTenNLShow.Text = maNguyenLieu;
        }

        private string GetCellValue(DataGridViewRow row, string columnName)
        {
            if (row == null) return "";

            if (!row.DataGridView.Columns.Contains(columnName))
                return "";

            object value = row.Cells[columnName].Value;

            return value == null ? "" : Convert.ToString(value);
        }

        private void dgvNguyenLieuCan_CellClick(object sender, DataGridViewCellEventArgs e)
        { 
            if (e.RowIndex < 0) return;

            DataGridViewRow row = dgvNguyenLieuCan.Rows[e.RowIndex];

            _selectedNguyenLieuCanRow = row.DataBoundItem as DataRowView;

            showChiTietNguyenLieuCan(row);
            HienThiLoaiNguyenLieuDangChon(row);
            CapNhatKhoaNguyenLieuDangChon();
            HienThiSaiSoNguyenLieuCan_lbl(row);
            //txtIdNLKhoQR.Clear();
            //txtIdNLKhoQR.Focus();

            string idKhoDaTru = GetValueFromSelectedNguyenLieu("IdKhoDaTru");

            if (string.IsNullOrWhiteSpace(idKhoDaTru))
            {
                idKhoDaTru = GetValueFromSelectedNguyenLieu("IdKho");
            }

            txtIdNLKhoShow.Multiline = true;
            txtIdNLKhoShow.WordWrap = true;
            txtIdNLKhoShow.ScrollBars = ScrollBars.Vertical;
            txtIdNLKhoShow.Text = FormatIdKhoDaTruForTextbox(idKhoDaTru);

            txtIdNLKhoQR.Focus();
        }

        private void HienThiLoaiNguyenLieuDangChon(DataGridViewRow row)
        {
            try
            {
                if (row == null)
                {
                    txtLoaiNguyenLieu.Text = "";
                    return;
                }

                string tenBaiLieu = _selectedTenBaiLieu;
                string stt = GetValueFromSelectedNguyenLieu("STT");
                string maNguyenLieu = GetValueFromSelectedNguyenLieu("maNguyenLieu");

                if (string.IsNullOrWhiteSpace(tenBaiLieu) ||
                    string.IsNullOrWhiteSpace(stt) ||
                    string.IsNullOrWhiteSpace(maNguyenLieu))
                {
                    txtLoaiNguyenLieu.Text = "Thường";
                    return;
                }

                string loai = _sqlDataService.GetLoaiNguyenLieuBaiTronLieu(
                    tenBaiLieu,
                    stt,
                    maNguyenLieu
                );

                txtLoaiNguyenLieu.Text = string.IsNullOrWhiteSpace(loai) ? "Thường" : loai;
            }
            catch (Exception ex)
            {
                txtLoaiNguyenLieu.Text = "Thường";
                AppendLog("- Không lấy được loại nguyên liệu, mặc định Thường. Lỗi: " + ex.Message);
            }
        }

        private void HienThiSaiSoNguyenLieuCan_lbl(DataGridViewRow row)
        {
            try
            {
                if (row == null)
                {
                    lblSaiSo.Text = "";
                    return;
                }

                string khoiLuongDatText = GetCellValue(row, "colKhoiLuong");
                string donViDat = GetCellValue(row, "colDonVi");
                string canSuDung = GetCellValue(row, "colCanSuDung");

                if (string.IsNullOrWhiteSpace(donViDat))
                {
                    donViDat = GetValueFromSelectedNguyenLieu("DonViBaiTron");

                    if (string.IsNullOrWhiteSpace(donViDat))
                        donViDat = GetValueFromSelectedNguyenLieu("donViCanXuat");
                }

                decimal khoiLuongDat = ParseDecimalSafe(khoiLuongDatText);

                if (khoiLuongDat <= 0)
                {
                    lblSaiSo.Text = "Giá trị đặt không hợp lệ.";
                    lblSaiSo.BackColor = Color.OrangeRed;
                    lblSaiSo.ForeColor = Color.White;
                    return;
                }

                string rawCanText = "";

                if (string.Equals(canSuDung, "Cân bàn", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCanBan.Text;
                }
                else if (string.Equals(canSuDung, "Cân 6kg", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCan6kg.Text;
                }
                else if (string.Equals(canSuDung, "Cân phân tích", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCanPhanTich.Text;
                }
                else
                {
                    lblSaiSo.Text = "Không xác định được cân sử dụng.";
                    lblSaiSo.BackColor = Color.OrangeRed;
                    lblSaiSo.ForeColor = Color.White;
                    return;
                }

                decimal khoiLuongThucTe = ParseWeightValue(rawCanText);

                string donViCanThucTe = ParseWeightUnit(rawCanText);

                if (string.IsNullOrWhiteSpace(donViCanThucTe))
                    donViCanThucTe = donViDat;

                khoiLuongThucTe = ConvertWeight(khoiLuongThucTe, donViCanThucTe, donViDat);

                decimal saiSoPhanTram = 0;

                if (khoiLuongDat > 0)
                {
                    saiSoPhanTram = ((khoiLuongThucTe - khoiLuongDat) / khoiLuongDat) * 100m;
                }

                lblSaiSo.Text =
                    "Giá trị đặt " +
                    khoiLuongDat.ToString("0.####", CultureInfo.InvariantCulture) +
                    donViDat +
                    " - sai số " +
                    saiSoPhanTram.ToString("0.###", CultureInfo.InvariantCulture) +
                    "%";

                if (Math.Abs(saiSoPhanTram) <= 0.5m)
                {
                    lblSaiSo.BackColor = Color.Green;
                    lblSaiSo.ForeColor = Color.White;
                }
                else
                {
                    lblSaiSo.BackColor = Color.OrangeRed;
                    lblSaiSo.ForeColor = Color.White;
                }
            }
            catch (Exception ex)
            {
                lblSaiSo.Text = "Không tính được sai số: " + ex.Message;
                lblSaiSo.BackColor = Color.OrangeRed;
                lblSaiSo.ForeColor = Color.White;
            }
        }
        private void HienThiSaiSoNguyenLieuCan(DataGridViewRow row)
        {
            try
            {
                if (row == null)
                {
                    lblSaiSo.Text = "";
                    return;
                }

                string khoiLuongDatText = GetCellValue(row, "colKhoiLuong");
                string donViDat = GetCellValue(row, "colDonVi");
                string canSuDung = GetCellValue(row, "colCanSuDung");

                if (string.IsNullOrWhiteSpace(donViDat))
                {
                    donViDat = GetValueFromSelectedNguyenLieu("DonViBaiTron");

                    if (string.IsNullOrWhiteSpace(donViDat))
                        donViDat = GetValueFromSelectedNguyenLieu("donViCanXuat");
                }

                decimal khoiLuongDat = ParseDecimalSafe(khoiLuongDatText);

                if (khoiLuongDat <= 0)
                {
                    lblSaiSo.Text = "Giá trị đặt không hợp lệ.";
                    lblSaiSo.BackColor = Color.OrangeRed;
                    lblSaiSo.ForeColor = Color.White;
                    return;
                }

                string rawCanText = "";

                if (string.Equals(canSuDung, "Cân bàn", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCanBan.Text;
                }
                else if (string.Equals(canSuDung, "Cân 6kg", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCan6kg.Text;
                }
                else if (string.Equals(canSuDung, "Cân phân tích", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCanPhanTich.Text;
                }
                else
                {
                    lblSaiSo.Text = "Không xác định được cân sử dụng.";
                    lblSaiSo.BackColor = Color.OrangeRed;
                    lblSaiSo.ForeColor = Color.White;
                    return;
                }

                decimal khoiLuongThucTe = ParseWeightValue(rawCanText);

                string donViCanThucTe = ParseWeightUnit(rawCanText);

                if (string.IsNullOrWhiteSpace(donViCanThucTe))
                    donViCanThucTe = donViDat;

                khoiLuongThucTe = ConvertWeight(khoiLuongThucTe, donViCanThucTe, donViDat);

                decimal saiSoPhanTram = 0;

                if (khoiLuongDat > 0)
                {
                    saiSoPhanTram = ((khoiLuongThucTe - khoiLuongDat) / khoiLuongDat) * 100m;
                }

                lblSaiSo.Text =
                    "Giá trị đặt " +
                    khoiLuongDat.ToString("0.####", CultureInfo.InvariantCulture) +
                    donViDat +
                    " - sai số " +
                    saiSoPhanTram.ToString("0.###", CultureInfo.InvariantCulture) +
                    "%";

                if (Math.Abs(saiSoPhanTram) <= 0.5m)
                {
                    lblSaiSo.BackColor = Color.Green;
                    lblSaiSo.ForeColor = Color.White;
                }
                else
                {
                    lblSaiSo.BackColor = Color.OrangeRed;
                    lblSaiSo.ForeColor = Color.White;
                }
            }
            catch (Exception ex)
            {
                lblSaiSo.Text = "Không tính được sai số: " + ex.Message;
                lblSaiSo.BackColor = Color.OrangeRed;
                lblSaiSo.ForeColor = Color.White;
            }
        }

        private string GetValueFromSelectedNguyenLieu(string columnName)
        {
            if (_selectedNguyenLieuCanRow == null) return "";

            if (!_selectedNguyenLieuCanRow.Row.Table.Columns.Contains(columnName))
                return "";

            object value = _selectedNguyenLieuCanRow[columnName];

            return value == null || value == DBNull.Value ? "" : Convert.ToString(value);
        }

        private void btnThemDLCan_Click(object sender, EventArgs e)
        {
            if (_dangLuuCan) return;
            if (File.Exists(PendingCanPath))
            {
                MessageBox.Show("Có nguyên liệu đang lưu dở. Vui lòng bấm Xác nhận lưu cân để gửi tiếp trước khi cân thêm.");
                return;
            }
            if (_selectedNguyenLieuCanRow == null) return;
            try
            {
                int savedCount = GetDaLuuNguyenLieuDangChon().Rows.Count;
                int required = Convert.ToInt32(Math.Floor(ParseDecimalSafe(GetValueFromSelectedNguyenLieu("soLuong"))));
                if (required <= 0 || savedCount >= required)
                {
                    MessageBox.Show("Nguyên liệu này đã đủ " + savedCount + "/" + required + " batch hoặc kế hoạch không hợp lệ. Vui lòng chọn nguyên liệu còn lại.");
                    return;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Không kiểm tra được dữ liệu cân đã lưu: " + ex.Message);
                return;
            }
            // Ví dụ sai số cho phép là ±2%
            // decimal saiSoChoPhep = 2;
            /*decimal saiSoChoPhep = ParseDecimalSafe(txtSaiSoChoPhep.Text);

            if (saiSoChoPhep <= 0)
            {
                MessageBox.Show("Sai số cho phép phải lớn hơn 0.", "Thông báo",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }*/

            //ThemDuLieuCan(saiSoChoPhep);
            // Tạo mã Batch tự động theo ngày giờ phút giây mili giây
            //txtNoiDungQRBatch.Text = GenerateBatchId();

            txtNoiDungQRBatch.Text = GenerateBatchId();

            decimal saiSoChoPhep = 0.5m;

            ThemDuLieuCan(saiSoChoPhep);
        }

        private string GenerateBatchId()
        {
            return "B" + DateTime.Now.ToString("yyyyMMddHHmmssfff");
        }

        private string GenerateShortBatchId()
        {
            // Ticks tính từ 2026-01-01 để mã ngắn hơn
            DateTime baseDate = new DateTime(2026, 1, 1, 0, 0, 0);
            long ticks = DateTime.Now.Ticks - baseDate.Ticks;

            // Rút gọn bằng Base36
            string timePart = ToBase36(ticks);

            // Thêm 2 ký tự random để tránh trùng nếu bấm quá nhanh cùng thời điểm
            string randomPart = ToBase36(new Random(Guid.NewGuid().GetHashCode()).Next(0, 1296)).PadLeft(2, '0');

            return timePart + randomPart;
        }

        private string ToBase36(long value)
        {
            const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            if (value == 0) return "0";

            string result = "";

            while (value > 0)
            {
                result = chars[(int)(value % 36)] + result;
                value /= 36;
            }

            return result;
        }

        private void ThemDuLieuCan(decimal saiSoPhanTramChoPhep)
        {
            try
            {
                if (_selectedNguyenLieuCanRow == null)
                {
                    MessageBox.Show("Vui lòng chọn nguyên liệu cần cân trước.", "Thông báo",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                string idShow = (txtIdNLKhoShow.Text ?? "").Trim();
                string idQr = (txtIdNLKhoQR.Text ?? "").Trim();
                string idKhoDaTruText = GetValueFromSelectedNguyenLieu("IdKhoDaTru");

                if (string.IsNullOrWhiteSpace(idKhoDaTruText))
                {
                    idKhoDaTruText = GetValueFromSelectedNguyenLieu("IdKho");
                }

                if (string.IsNullOrWhiteSpace(idShow))
                {
                    MessageBox.Show("Chưa có Id nguyên liệu kho đang chọn.", "Thiếu dữ liệu",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (string.IsNullOrWhiteSpace(idQr))
                {
                    MessageBox.Show("Chưa quét QR nguyên liệu.", "Thiếu dữ liệu",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (!IsQrInIdKhoDaTruList(idQr, idKhoDaTruText))
                {
                    MessageBox.Show(
                        "QR nguyên liệu không đúng." + Environment.NewLine +
                        "Các Id kho được phép:" + Environment.NewLine +
                        FormatIdKhoDaTruForTextbox(idKhoDaTruText) + Environment.NewLine + Environment.NewLine +
                        "Id QR quét: " + idQr,
                        "Sai nguyên liệu",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                string canSuDung = GetValueFromSelectedNguyenLieu("canSuDung");
                string soLuongText = GetValueFromSelectedNguyenLieu("soLuong");
                string khoiLuongDatText = GetValueFromSelectedNguyenLieu("KhoiLuong");
                string donViDat = GetValueFromSelectedNguyenLieu("DonViBaiTron");

                if (string.IsNullOrWhiteSpace(donViDat))
                {
                    donViDat = GetValueFromSelectedNguyenLieu("donViCanXuat");
                }

                decimal soLuongKeHoach = ParseDecimalSafe(soLuongText);
                decimal khoiLuongDat = ParseDecimalSafe(khoiLuongDatText);

                if (soLuongKeHoach <= 0)
                {
                    MessageBox.Show("Số lượng kế hoạch không hợp lệ.", "Lỗi dữ liệu",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                if (khoiLuongDat <= 0)
                {
                    MessageBox.Show("Khối lượng đặt không hợp lệ.", "Lỗi dữ liệu",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                string rawCanText = "";
                string donViCanThucTe = donViDat;

                if (string.Equals(canSuDung, "Cân bàn", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCanBan.Text;
                }
                else if (string.Equals(canSuDung, "Cân 6kg", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCan6kg.Text;
                }
                else if (string.Equals(canSuDung, "Cân phân tích", StringComparison.OrdinalIgnoreCase))
                {
                    rawCanText = txtValCanPhanTich.Text;
                }
                else
                {
                    MessageBox.Show("Không xác định được cân sử dụng: " + canSuDung, "Lỗi",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                decimal khoiLuongThucTe = ParseWeightValue(rawCanText);

                string unitFromText = ParseWeightUnit(rawCanText);
                if (!string.IsNullOrWhiteSpace(unitFromText))
                {
                    donViCanThucTe = unitFromText;
                }

                khoiLuongThucTe = ConvertWeight(khoiLuongThucTe, donViCanThucTe, donViDat);

                if (khoiLuongThucTe <= 0)
                {
                    MessageBox.Show("Khối lượng thực tế cân không hợp lệ.", "Lỗi cân",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                decimal saiSoPhanTram = 0;

                if (khoiLuongDat > 0)
                {
                    saiSoPhanTram = ((khoiLuongThucTe - khoiLuongDat) / khoiLuongDat) * 100m;
                }

                if (Math.Abs(saiSoPhanTram) > saiSoPhanTramChoPhep)
                {
                    MessageBox.Show(
                        "Khối lượng cân vượt quá sai số cho phép." + Environment.NewLine +
                        "Khối lượng đặt: " + khoiLuongDat.ToString("0.###") + " " + donViDat + Environment.NewLine +
                        "Khối lượng thực tế: " + khoiLuongThucTe.ToString("0.###") + " " + donViDat + Environment.NewLine +
                        "Sai số thực tế: " + saiSoPhanTram.ToString("0.###") + "%" + Environment.NewLine +
                        "Sai số cho phép: ±" + saiSoPhanTramChoPhep.ToString("0.###") + "%",
                        "Quá sai số",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
                }

                string idBatch = (txtNoiDungQRBatch.Text ?? "").Trim();

                if (string.IsNullOrWhiteSpace(idBatch))
                {
                    MessageBox.Show("Chưa có IdBatch. Vui lòng quét hoặc tạo QR Batch trước.", "Thiếu dữ liệu",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                EnsureChiTietCanTable();

                string phieuXuatId = GetValueFromSelectedNguyenLieu("PhieuXuatId");
                string keHoachId = GetValueFromSelectedNguyenLieu("KeHoachId");
                string idKho = GetValueFromSelectedNguyenLieu("IdKho");
                string idKhoDaTru = GetValueFromSelectedNguyenLieu("IdKhoDaTru");
                string maNguyenLieu = GetValueFromSelectedNguyenLieu("maNguyenLieu");
                string tenNguyenLieu = GetValueFromSelectedNguyenLieu("tenNguyenLieu");
                string stt = GetValueFromSelectedNguyenLieu("STT");

                int soLuongMax = Convert.ToInt32(Math.Floor(soLuongKeHoach));

                int sttBatchNL = GetNextSttBatchNLForNguyenLieu(
                    phieuXuatId,
                    keHoachId,
                    maNguyenLieu,
                    stt
                );

                if (sttBatchNL > soLuongMax)
                {
                    MessageBox.Show(
                        "Nguyên liệu này đã cân đủ " + soLuongMax + " batch." + Environment.NewLine +
                        "Nguyên liệu: " + tenNguyenLieu + Environment.NewLine +
                        "Id kho: " + idKho,
                        "Đã đủ batch",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                    return;
                }

                DataRow newRow = _dtChiTietCan.NewRow();

                // Các cột y hệt PhieuXuatNguyenLieu
                SetRowValue(newRow, "PhieuXuatId", phieuXuatId);
                SetRowValue(newRow, "KeHoachId", keHoachId);
                SetRowValue(newRow, "tenBaiLieu", GetValueFromSelectedNguyenLieu("tenBaiLieu"));
                SetRowValue(newRow, "soLuong", GetValueFromSelectedNguyenLieu("soLuong"));
                SetRowValue(newRow, "NgaySanXuat", GetValueFromSelectedNguyenLieu("NgaySanXuat"));
                SetRowValue(newRow, "STT", GetValueFromSelectedNguyenLieu("STT"));
                SetRowValue(newRow, "maNguyenLieu", GetValueFromSelectedNguyenLieu("maNguyenLieu"));
                SetRowValue(newRow, "tenNguyenLieu", GetValueFromSelectedNguyenLieu("tenNguyenLieu"));
                SetRowValue(newRow, "loaiNguyenLieu", txtLoaiNguyenLieu.Text.Trim());
                SetRowValue(newRow, "khoiLuongCanXuat", GetValueFromSelectedNguyenLieu("khoiLuongCanXuat"));
                SetRowValue(newRow, "donViCanXuat", GetValueFromSelectedNguyenLieu("donViCanXuat"));
                SetRowValue(newRow, "sttTron", GetValueFromSelectedNguyenLieu("sttTron"));
                SetRowValue(newRow, "canSuDung", canSuDung);
                SetRowValue(newRow, "IdKho", idKho);
                SetRowValue(newRow, "khoiLuongKho", GetValueFromSelectedNguyenLieu("khoiLuongKho"));
                SetRowValue(newRow, "donViKho", GetValueFromSelectedNguyenLieu("donViKho"));
                SetRowValue(newRow, "quyCachDongGoi", GetValueFromSelectedNguyenLieu("quyCachDongGoi"));
                SetRowValue(newRow, "LotNo", GetValueFromSelectedNguyenLieu("LotNo"));
                SetRowValue(newRow, "ngaySanXuatKho", GetValueFromSelectedNguyenLieu("ngaySanXuatKho"));
                SetRowValue(newRow, "hanSuDung", GetValueFromSelectedNguyenLieu("hanSuDung"));
                SetRowValue(newRow, "nhaCungCap", GetValueFromSelectedNguyenLieu("nhaCungCap"));
                SetRowValue(newRow, "ngayNhap", GetValueFromSelectedNguyenLieu("ngayNhap"));
                SetRowValue(newRow, "nguoiTao", GetValueFromSelectedNguyenLieu("nguoiTao"));
                SetRowValue(newRow, "ngayTao", GetValueFromSelectedNguyenLieu("ngayTao"));
                SetRowValue(newRow, "trangThaiPheDuyet", GetValueFromSelectedNguyenLieu("trangThaiPheDuyet"));
                SetRowValue(newRow, "cachXuat", GetValueFromSelectedNguyenLieu("cachXuat"));
                SetRowValue(newRow, "nguoiPheDuyet", GetValueFromSelectedNguyenLieu("nguoiPheDuyet"));
                SetRowValue(newRow, "thoiGianDuyet", GetValueFromSelectedNguyenLieu("thoiGianDuyet"));
                SetRowValue(newRow, "IdKhoDaTru", GetValueFromSelectedNguyenLieu("IdKhoDaTru"));
                SetRowValue(newRow, "IdTuKhoDenBatch", idQr);

                // Các cột mới
                SetRowValue(newRow, "KhoiLuong", khoiLuongDat.ToString("0.####", CultureInfo.InvariantCulture));
                SetRowValue(newRow, "SttBatchNL", sttBatchNL.ToString());
                SetRowValue(newRow, "IdBatch", idBatch);
                SetRowValue(newRow, "khoiLuongThucTe", khoiLuongThucTe.ToString("0.####", CultureInfo.InvariantCulture));
                SetRowValue(newRow, "saiSo", saiSoPhanTram.ToString("0.###", CultureInfo.InvariantCulture) + "%");
                SetRowValue(newRow, "nguoiCan", txtTenDangNhap.Text.Trim());
                SetRowValue(newRow, "thoiGianCan", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));

                _dtChiTietCan.Rows.Add(newRow);

                dataGridViewChiTietCan.DataSource = _dtChiTietCan;

                StyleChiTietCanGrid();
                AnCotTenNguyenLieuTrongChiTietCan();

                AppendLog(
                    "- Đã thêm dữ liệu cân: " +
                    GetValueFromSelectedNguyenLieu("tenNguyenLieu") +
                    " | Batch " + sttBatchNL +
                    " | " + khoiLuongThucTe.ToString("0.###") + " " + donViDat +
                    " | Sai số " + saiSoPhanTram.ToString("0.###") + "%"
                );

                txtIdNLKhoQR.Clear();
                //txtQRScan.Clear();
                //txtQRScan.Focus();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không thêm được dữ liệu cân." + Environment.NewLine + Environment.NewLine + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void EnsureChiTietCanTable()
        {
            if (_dtChiTietCan != null) return;

            _dtChiTietCan = new DataTable();

            string[] columns = new string[]
            {
                "PhieuXuatId",
                "KeHoachId",
                "tenBaiLieu",
                "soLuong",
                "NgaySanXuat",
                "STT",
                "maNguyenLieu",
                "tenNguyenLieu",
                "loaiNguyenLieu",
                "khoiLuongCanXuat",
                "donViCanXuat",
                "sttTron",
                "canSuDung",
                "IdKho",
                "khoiLuongKho",
                "donViKho",
                "quyCachDongGoi",
                "LotNo",
                "ngaySanXuatKho",
                "hanSuDung",
                "nhaCungCap",
                "ngayNhap",
                "nguoiTao",
                "ngayTao",
                "trangThaiPheDuyet",
                "cachXuat",
                "nguoiPheDuyet",
                "thoiGianDuyet",
                "IdKhoDaTru",
                "IdTuKhoDenBatch",

                "KhoiLuong",
                "SttBatchNL",
                "IdBatch",
                "khoiLuongThucTe",
                "saiSo",
                "nguoiCan",
                "thoiGianCan"
            };

            foreach (string col in columns)
            {
                _dtChiTietCan.Columns.Add(col, typeof(string));
            }

            dataGridViewChiTietCan.AutoGenerateColumns = true;
            dataGridViewChiTietCan.DataSource = _dtChiTietCan;
            AnCotTenNguyenLieuTrongChiTietCan();
        }

        private int GetNextSttBatchNL(string idBatch, string phieuXuatId, string keHoachId, string idKho)
        {
            EnsureChiTietCanTable();

            int count = 0;

            foreach (DataRow row in _dtChiTietCan.Rows)
            {
                string rowIdBatch = Convert.ToString(row["IdBatch"]);
                string rowPhieuXuatId = Convert.ToString(row["PhieuXuatId"]);
                string rowKeHoachId = Convert.ToString(row["KeHoachId"]);
                string rowIdKho = Convert.ToString(row["IdKho"]);

                bool same =
                    string.Equals(rowIdBatch, idBatch, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(rowPhieuXuatId, phieuXuatId, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(rowKeHoachId, keHoachId, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(rowIdKho, idKho, StringComparison.OrdinalIgnoreCase);

                if (same) count++;
            }

            return count + 1;
        }

        private int GetNextSttBatchNLForNguyenLieu(string phieuXuatId, string keHoachId, string maNguyenLieu, string stt)
        {
            EnsureChiTietCanTable();

            int maxStt = 0;
            DataTable saved = _sqlDataService.GetDaLuuNguyenLieuCan(phieuXuatId, keHoachId,
                GetValueFromSelectedNguyenLieu("tenBaiLieu"), stt, maNguyenLieu);
            foreach (DataRow row in saved.Rows)
            {
                int number;
                if (int.TryParse(Convert.ToString(row["SttBatchNL"]), out number)) maxStt = Math.Max(maxStt, number);
            }

            foreach (DataRow row in _dtChiTietCan.Rows)
            {
                string rowPhieuXuatId = Convert.ToString(row["PhieuXuatId"]);
                string rowKeHoachId = Convert.ToString(row["KeHoachId"]);
                string rowMaNguyenLieu = Convert.ToString(row["maNguyenLieu"]);
                string rowStt = Convert.ToString(row["STT"]);

                bool same =
                    string.Equals(rowPhieuXuatId, phieuXuatId, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(rowKeHoachId, keHoachId, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(rowMaNguyenLieu, maNguyenLieu, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(rowStt, stt, StringComparison.OrdinalIgnoreCase);

                if (!same) continue;

                int currentStt = 0;
                int.TryParse(Convert.ToString(row["SttBatchNL"]), out currentStt);

                if (currentStt > maxStt)
                    maxStt = currentStt;
            }

            return maxStt + 1;
        }

        private void SetRowValue(DataRow row, string columnName, string value)
        {
            if (row.Table.Columns.Contains(columnName))
            {
                row[columnName] = value ?? "";
            }
        }

        private decimal ParseDecimalSafe(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return 0;

            text = text.Trim();

            // Bỏ đơn vị nếu chuỗi có dạng "2.65 kg", "2.65g"
            text = Regex.Replace(text, "kg", "", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, "g", "", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, "tấn", "", RegexOptions.IgnoreCase);
            text = Regex.Replace(text, "tan", "", RegexOptions.IgnoreCase);
            text = text.Replace(" ", "");

            decimal value;

            bool hasDot = text.Contains(".");
            bool hasComma = text.Contains(",");

            // Có cả dấu . và dấu ,
            // 1,234.56 => 1234.56
            // 1.234,56 => 1234.56
            if (hasDot && hasComma)
            {
                int lastDot = text.LastIndexOf(".");
                int lastComma = text.LastIndexOf(",");

                if (lastDot > lastComma)
                {
                    // Dạng quốc tế
                    text = text.Replace(",", "");

                    if (decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out value))
                        return value;
                }
                else
                {
                    // Dạng Việt Nam
                    text = text.Replace(".", "");
                    text = text.Replace(",", ".");

                    if (decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out value))
                        return value;
                }
            }

            // Chỉ có dấu . thì coi . là dấu thập phân
            // 2.6 => 2.6
            // 2.65 => 2.65
            // 21.8 => 21.8
            if (hasDot && !hasComma)
            {
                if (decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out value))
                    return value;
            }

            // Chỉ có dấu , thì coi , là dấu thập phân
            // 2,6 => 2.6
            // 2,65 => 2.65
            if (!hasDot && hasComma)
            {
                text = text.Replace(",", ".");

                if (decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out value))
                    return value;
            }

            // Số nguyên
            if (decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out value))
                return value;

            return 0;
        }

        private decimal ParseWeightValue(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return 0;

            Match match = Regex.Match(text, @"[-+]?\d+([.,]\d+)?");

            if (!match.Success) return 0;

            return ParseDecimalSafe(match.Value);
        }

        private string ParseWeightUnit(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";

            string lower = text.ToLower();

            if (lower.Contains("kg")) return "kg";
            if (lower.Contains("g")) return "g";
            if (lower.Contains("tấn") || lower.Contains("tan")) return "tấn";

            return "";
        }

        private decimal ConvertWeight(decimal value, string fromUnit, string toUnit)
        {
            fromUnit = NormalizeUnit(fromUnit);
            toUnit = NormalizeUnit(toUnit);

            if (fromUnit == toUnit) return value;

            // Đổi về gram
            decimal gram = value;

            if (fromUnit == "kg")
                gram = value * 1000m;
            else if (fromUnit == "tấn")
                gram = value * 1000000m;
            else if (fromUnit == "g")
                gram = value;

            // Đổi từ gram sang đơn vị đích
            if (toUnit == "kg")
                return gram / 1000m;

            if (toUnit == "tấn")
                return gram / 1000000m;

            return gram;
        }

        private string NormalizeUnit(string unit)
        {
            unit = (unit ?? "").Trim().ToLower();

            if (unit == "kilogram" || unit == "kgs") return "kg";
            if (unit == "gram" || unit == "grams") return "g";
            if (unit == "tan" || unit == "ton") return "tấn";

            return unit;
        }

        private void StyleChiTietCanGrid()
        {
            dataGridViewChiTietCan.AllowUserToAddRows = false;
            dataGridViewChiTietCan.AllowUserToDeleteRows = false;
            dataGridViewChiTietCan.ReadOnly = true;
            dataGridViewChiTietCan.MultiSelect = false;
            dataGridViewChiTietCan.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewChiTietCan.RowHeadersVisible = false;

            dataGridViewChiTietCan.BackgroundColor = Color.White;
            dataGridViewChiTietCan.BorderStyle = BorderStyle.None;
            dataGridViewChiTietCan.GridColor = Color.FromArgb(229, 231, 235);

            dataGridViewChiTietCan.EnableHeadersVisualStyles = false;
            dataGridViewChiTietCan.ColumnHeadersHeight = 38;

            dataGridViewChiTietCan.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(22, 163, 74);
            dataGridViewChiTietCan.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            dataGridViewChiTietCan.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            dataGridViewChiTietCan.ColumnHeadersDefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter;

            dataGridViewChiTietCan.DefaultCellStyle.BackColor = Color.White;
            dataGridViewChiTietCan.DefaultCellStyle.ForeColor = Color.FromArgb(17, 24, 39);
            dataGridViewChiTietCan.DefaultCellStyle.Font = new Font("Segoe UI", 9.5F);
            dataGridViewChiTietCan.DefaultCellStyle.SelectionBackColor = Color.FromArgb(220, 252, 231);
            dataGridViewChiTietCan.DefaultCellStyle.SelectionForeColor = Color.FromArgb(17, 24, 39);

            dataGridViewChiTietCan.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(248, 250, 252);
            dataGridViewChiTietCan.AlternatingRowsDefaultCellStyle.ForeColor = Color.FromArgb(17, 24, 39);

            dataGridViewChiTietCan.RowTemplate.Height = 36;
            dataGridViewChiTietCan.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells;
        }

        private List<string> SplitIdKhoDaTru(string text)
        {
            List<string> result = new List<string>();

            if (string.IsNullOrWhiteSpace(text))
                return result;

            string[] parts = text
                .Replace(";", ",")
                .Replace(Environment.NewLine, ",")
                .Replace("\r", ",")
                .Replace("\n", ",")
                .Split(',');

            foreach (string part in parts)
            {
                string id = (part ?? "").Trim();

                if (!string.IsNullOrWhiteSpace(id) &&
                    !result.Any(x => string.Equals(x, id, StringComparison.OrdinalIgnoreCase)))
                {
                    result.Add(id);
                }
            }

            return result;
        }

        private string FormatIdKhoDaTruForTextbox(string text)
        {
            List<string> ids = SplitIdKhoDaTru(text);
            return string.Join(Environment.NewLine, ids);
        }

        private bool IsQrInIdKhoDaTruList(string qr, string idKhoDaTruText)
        {
            qr = (qr ?? "").Trim();

            if (string.IsNullOrWhiteSpace(qr))
                return false;

            List<string> ids = SplitIdKhoDaTru(idKhoDaTruText);

            return ids.Any(x => string.Equals(x, qr, StringComparison.OrdinalIgnoreCase));
        }

        private void txtNoiDungQRBatch_TextChanged(object sender, EventArgs e)
        {
            //TaoQRChoBatch();
            TaoBarcodeChoBatch();
        }

        private void TaoQRChoBatch()
        {
            try
            {
                string noiDung = (txtNoiDungQRBatch.Text ?? "").Trim();

                // Nếu textbox rỗng thì xóa ảnh QR
                if (string.IsNullOrWhiteSpace(noiDung))
                {
                    if (ptbQRshow.Image != null)
                    {
                        var oldImg = ptbQRshow.Image;
                        ptbQRshow.Image = null;
                        oldImg.Dispose();
                    }
                    return;
                }

                using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
                using (QRCodeData qrCodeData = qrGenerator.CreateQrCode(noiDung, QRCodeGenerator.ECCLevel.Q))
                using (QRCode qrCode = new QRCode(qrCodeData))
                {
                    Bitmap qrImage = qrCode.GetGraphic(20, Color.Black, Color.White, true);

                    // Giải phóng ảnh cũ tránh đầy RAM
                    if (ptbQRshow.Image != null)
                    {
                        var oldImg = ptbQRshow.Image;
                        ptbQRshow.Image = null;
                        oldImg.Dispose();
                    }

                    ptbQRshow.Image = new Bitmap(qrImage);
                    ptbQRshow.SizeMode = PictureBoxSizeMode.Zoom;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tạo được mã QR.\n\n" + ex.Message,
                    "Lỗi QR",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void TaoBarcodeChoScanBatch_SX()
        {
            try
            {
                string noiDung = (txtScanBatch_SX.Text ?? "").Trim();

                if (string.IsNullOrWhiteSpace(noiDung))
                {
                    if (ptbBar_SX.Image != null)
                    {
                        Image oldImg = ptbBar_SX.Image;
                        ptbBar_SX.Image = null;
                        oldImg.Dispose();
                    }

                    return;
                }

                Barcode barcode = new Barcode();

                barcode.IncludeLabel = true;
                barcode.Alignment = AlignmentPositions.CENTER;
                barcode.LabelPosition = LabelPositions.BOTTOMCENTER;
                barcode.LabelFont = new Font("Segoe UI", 10F, FontStyle.Bold);

                int barcodeWidth = 520;
                int barcodeHeight = 150;

                Image rawImage = barcode.Encode(
                    TYPE.CODE128,
                    noiDung,
                    Color.Black,
                    Color.White,
                    barcodeWidth,
                    barcodeHeight
                );

                Bitmap rawBitmap = new Bitmap(rawImage);

                // Dùng lại hàm TrimWhiteSpace bạn đã có trong Form1
                Bitmap croppedBitmap = TrimWhiteSpace(rawBitmap, 12);

                if (ptbBar_SX.Image != null)
                {
                    Image oldImg = ptbBar_SX.Image;
                    ptbBar_SX.Image = null;
                    oldImg.Dispose();
                }

                ptbBar_SX.Image = croppedBitmap;
                ptbBar_SX.SizeMode = PictureBoxSizeMode.Zoom;

                rawBitmap.Dispose();
                rawImage.Dispose();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tạo được barcode từ mã Batch quét." +
                    Environment.NewLine + Environment.NewLine +
                    ex.Message,
                    "Lỗi barcode",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void TaoBarcodeChoBatch()
        {
            try
            {
                string noiDung = (txtNoiDungQRBatch.Text ?? "").Trim();

                if (string.IsNullOrWhiteSpace(noiDung))
                {
                    if (ptbQRshow.Image != null)
                    {
                        Image oldImg = ptbQRshow.Image;
                        ptbQRshow.Image = null;
                        oldImg.Dispose();
                    }
                    return;
                }

                Barcode barcode = new Barcode();

                barcode.IncludeLabel = true;
                barcode.Alignment = AlignmentPositions.CENTER;
                barcode.LabelPosition = LabelPositions.BOTTOMCENTER;
                barcode.LabelFont = new Font("Segoe UI", 10F, FontStyle.Bold);

                // Tạo ảnh rộng trước, rồi crop viền trắng sau
                int barcodeWidth = 520;
                int barcodeHeight = 150;

                Image rawImage = barcode.Encode(
                    TYPE.CODE128,
                    noiDung,
                    Color.Black,
                    Color.White,
                    barcodeWidth,
                    barcodeHeight
                );

                Bitmap rawBitmap = new Bitmap(rawImage);

                // Padding giữ lại khoảng trắng an toàn cho máy quét
                Bitmap croppedBitmap = TrimWhiteSpace(rawBitmap, 12);

                if (ptbQRshow.Image != null)
                {
                    Image oldImg = ptbQRshow.Image;
                    ptbQRshow.Image = null;
                    oldImg.Dispose();
                }

                ptbQRshow.Image = croppedBitmap;
                ptbQRshow.SizeMode = PictureBoxSizeMode.Zoom;

                rawBitmap.Dispose();
                rawImage.Dispose();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tạo được mã barcode.\n\n" + ex.Message,
                    "Lỗi barcode",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private Bitmap TrimWhiteSpace(Bitmap source, int padding)
        {
            int width = source.Width;
            int height = source.Height;

            int left = width;
            int right = 0;
            int top = height;
            int bottom = 0;

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    Color pixel = source.GetPixel(x, y);

                    // Coi pixel không trắng là nội dung cần giữ
                    if (pixel.R < 245 || pixel.G < 245 || pixel.B < 245)
                    {
                        if (x < left) left = x;
                        if (x > right) right = x;
                        if (y < top) top = y;
                        if (y > bottom) bottom = y;
                    }
                }
            }

            if (right < left || bottom < top)
                return new Bitmap(source);

            left = Math.Max(0, left - padding);
            top = Math.Max(0, top - padding);
            right = Math.Min(width - 1, right + padding);
            bottom = Math.Min(height - 1, bottom + padding);

            Rectangle cropRect = new Rectangle(
                left,
                top,
                right - left + 1,
                bottom - top + 1
            );

            return source.Clone(cropRect, source.PixelFormat);
        }

        private void printQrDocument_PrintPage(object sender, PrintPageEventArgs e)
        {
            string batchText = (txtNoiDungQRBatch.Text ?? "").Trim();

            if (string.IsNullOrWhiteSpace(batchText))
            {
                e.HasMorePages = false;
                return;
            }

            e.Graphics.PageUnit = GraphicsUnit.Display;
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
            e.Graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
            e.Graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
            e.Graphics.Clear(Color.White);

            // Tạo lại barcode trực tiếp khi in, không lấy từ PictureBox nữa
            Barcode barcode = new Barcode();
            barcode.IncludeLabel = false;
            barcode.Alignment = AlignmentPositions.CENTER;
            barcode.Width = 700;
            barcode.Height = 220;

            using (Image barcodeImage = barcode.Encode(
                TYPE.CODE128,
                batchText,
                Color.Black,
                Color.White,
                barcode.Width,
                barcode.Height))
            {
                int pageLeft = e.MarginBounds.Left;
                int pageTop = e.MarginBounds.Top;
                int pageWidth = e.MarginBounds.Width;

                // Kích thước barcode trên giấy
                int printWidth = Math.Min(500, pageWidth);
                int printHeight = 120;

                int x = pageLeft + (pageWidth - printWidth) / 2;
                int y = pageTop;

                Rectangle barcodeRect = new Rectangle(x, y, printWidth, printHeight);

                // Vẽ barcode
                e.Graphics.FillRectangle(Brushes.White, barcodeRect);
                e.Graphics.DrawImage(barcodeImage, barcodeRect);

                // Vẽ chữ Batch bên dưới
                using (Font font = new Font("Segoe UI", 10F, FontStyle.Bold))
                using (StringFormat sf = new StringFormat())
                {
                    sf.Alignment = StringAlignment.Center;
                    sf.LineAlignment = StringAlignment.Center;

                    RectangleF textRect = new RectangleF(
                        pageLeft,
                        y + printHeight + 8,
                        pageWidth,
                        30
                    );

                    e.Graphics.DrawString(batchText, font, Brushes.Black, textRect, sf);
                }
            }

            e.HasMorePages = false;
        }

        private void btnInQR_Click(object sender, EventArgs e)
        {
            string batchText = (txtNoiDungQRBatch.Text ?? "").Trim();

            if (string.IsNullOrWhiteSpace(batchText))
            {
                MessageBox.Show(
                    "Chưa có nội dung Batch để in.",
                    "Thông báo",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            using (PrintDialog printDialog = new PrintDialog())
            {
                printDialog.AllowSelection = false;
                printDialog.AllowSomePages = false;
                printDialog.UseEXDialog = true;

                if (printDialog.ShowDialog() != DialogResult.OK)
                    return;

                string printerName = printDialog.PrinterSettings.PrinterName;

                // Nếu chọn Zebra thì gửi ZPL trực tiếp
                if (printerName.ToUpper().Contains("ZEBRA") || printerName.ToUpper().Contains("ZT231"))
                {
                    string zpl = BuildZebraBarcodeZpl(batchText);

                    bool ok = RawPrinterHelper.SendStringToPrinter(printerName, zpl);

                    if (!ok)
                    {
                        MessageBox.Show(
                            "Gửi lệnh ZPL sang máy in Zebra thất bại.",
                            "Lỗi in Zebra",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                        return;
                    }

                    MessageBox.Show(
                        "Đã gửi barcode sang máy in Zebra.",
                        "Thành công",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );

                    return;
                }

                // Máy thường như XP-80C thì dùng PrintDocument hiện tại
                _printQrDocument.PrinterSettings = printDialog.PrinterSettings;
                _printQrDocument.Print();
            }
        }

        private string BuildZebraBarcodeZpl(string batchText)
        {
            string safeText = (batchText ?? "").Trim();

            string zpl =
                "^XA" +
                "^CI28" +
                "^PW1228" +
                "^LL319" +
                "^LH0,0" +
                "^LS0" +
                "^LT0" +

                // TEM TRÁI
                // Barcode không in chữ tự động
                "^FO60,18" +
                "^BY2,2,175" +
                "^BCN,175,N,N,N" +
                "^FD" + safeText + "^FS" +

                // Chữ batch tự in, to hơn
                "^FO95,205" +
                "^A0N,42,42" +
                "^FD" + safeText + "^FS" +

                // TEM PHẢI
                "^FO674,18" +
                "^BY2,2,175" +
                "^BCN,175,N,N,N" +
                "^FD" + safeText + "^FS" +

                "^FO709,205" +
                "^A0N,42,42" +
                "^FD" + safeText + "^FS" +

                "^PQ1" +
                "^XZ";

            return zpl;
        }
         

        private void dataGridViewChiTietCan_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0) return;

            DataGridViewRow row = dataGridViewChiTietCan.Rows[e.RowIndex];

            string idBatch = GetCellValue(row, "IdBatch");

            if (!string.IsNullOrWhiteSpace(idBatch))
            {
                txtNoiDungQRBatch.Text = idBatch;
            }

            ShowPopupChiTietCan(row);
        }

        private void ShowPopupChiTietCan(DataGridViewRow row)
        {
            if (row == null) return;

            StringBuilder sb = new StringBuilder();

            foreach (DataGridViewCell cell in row.Cells)
            {
                if (cell.OwningColumn == null) continue;

                string header = cell.OwningColumn.HeaderText;
                string value = cell.Value == null ? "" : Convert.ToString(cell.Value);

                if (string.IsNullOrWhiteSpace(header))
                    header = cell.OwningColumn.Name;

                sb.AppendLine("- " + header + ": " + value);
            }

            MessageBox.Show(
                sb.ToString(),
                "Chi tiết dữ liệu cân",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        private string MakeNguyenLieuKey(string phieuXuatId, string keHoachId, string stt, string maNguyenLieu)
        {
            return
                (phieuXuatId ?? "").Trim().ToUpper() + "|" +
                (keHoachId ?? "").Trim().ToUpper() + "|" +
                (stt ?? "").Trim().ToUpper() + "|" +
                (maNguyenLieu ?? "").Trim().ToUpper();
        }
        private string GetDataRowViewValue(DataRowView drv, string columnName)
        {
            if (drv == null) return "";

            if (!drv.Row.Table.Columns.Contains(columnName))
                return "";

            object value = drv[columnName];

            return value == null || value == DBNull.Value ? "" : Convert.ToString(value);
        }
        private bool KiemTraDaCanDuSoLuong(out string message)
        {
            message = "";

            if (dgvNguyenLieuCan.Rows.Count == 0)
            {
                message = "Chưa có danh sách nguyên liệu cần cân.";
                return false;
            }

            if (_dtChiTietCan == null || _dtChiTietCan.Rows.Count == 0)
            {
                message = "Chưa có dữ liệu cân trong bảng chi tiết cân.";
                return false;
            }

            StringBuilder sb = new StringBuilder();

            foreach (DataGridViewRow gridRow in dgvNguyenLieuCan.Rows)
            {
                if (gridRow.IsNewRow) continue;

                DataRowView drv = gridRow.DataBoundItem as DataRowView;

                if (drv == null) continue;

                string phieuXuatId = GetDataRowViewValue(drv, "PhieuXuatId");
                string keHoachId = GetDataRowViewValue(drv, "KeHoachId");
                string stt = GetDataRowViewValue(drv, "STT");
                string maNguyenLieu = GetDataRowViewValue(drv, "maNguyenLieu");
                string tenNguyenLieu = GetDataRowViewValue(drv, "tenNguyenLieu");
                string soLuongText = GetDataRowViewValue(drv, "soLuong");

                int soLuongCan = Convert.ToInt32(Math.Floor(ParseDecimalSafe(soLuongText)));

                if (soLuongCan <= 0)
                {
                    sb.AppendLine("- " + tenNguyenLieu + ": số lượng kế hoạch không hợp lệ.");
                    continue;
                }

                string keyCan = MakeNguyenLieuKey(phieuXuatId, keHoachId, stt, maNguyenLieu);

                int soLuongDaCan = 0;

                foreach (DataRow canRow in _dtChiTietCan.Rows)
                {
                    string rowPhieuXuatId = Convert.ToString(canRow["PhieuXuatId"]);
                    string rowKeHoachId = Convert.ToString(canRow["KeHoachId"]);
                    string rowStt = Convert.ToString(canRow["STT"]);
                    string rowMaNguyenLieu = Convert.ToString(canRow["maNguyenLieu"]);

                    string keyDaCan = MakeNguyenLieuKey(
                        rowPhieuXuatId,
                        rowKeHoachId,
                        rowStt,
                        rowMaNguyenLieu
                    );

                    if (keyDaCan == keyCan)
                    {
                        soLuongDaCan++;
                    }
                }

                if (soLuongDaCan < soLuongCan)
                {
                    sb.AppendLine("- " + tenNguyenLieu + ": chưa đủ " + soLuongDaCan + "/" + soLuongCan + " mẻ.");
                }
                else if (soLuongDaCan > soLuongCan)
                {
                    sb.AppendLine("- " + tenNguyenLieu + ": bị dư " + soLuongDaCan + "/" + soLuongCan + " mẻ.");
                }
            }

            if (sb.Length > 0)
            {
                message = sb.ToString();
                return false;
            }

            message = "Đã cân đủ toàn bộ nguyên liệu.";
            return true;
        }

        private async void btnXacNhanLuuCanNL_Click(object sender, EventArgs e)
        {
            if (_dangLuuCan) return;
            bool wasAddEnabled = btnThemDLCan.Enabled;
            try
            {
                DataTable snapshot;
                bool retry = File.Exists(PendingCanPath);
                if (retry)
                {
                    var pending = new DataSet();
                    pending.ReadXml(PendingCanPath, XmlReadMode.ReadSchema);
                    snapshot = pending.Tables[0];
                }
                else
                {
                    if (_selectedNguyenLieuCanRow == null || _dtChiTietCan == null)
                        throw new InvalidOperationException("Vui lòng chọn nguyên liệu cần lưu.");
                    snapshot = NguyenLieuCanSave.SelectForSave(_dtChiTietCan,
                        GetValueFromSelectedNguyenLieu("PhieuXuatId"), GetValueFromSelectedNguyenLieu("KeHoachId"),
                        GetValueFromSelectedNguyenLieu("tenBaiLieu"), GetValueFromSelectedNguyenLieu("STT"),
                        GetValueFromSelectedNguyenLieu("maNguyenLieu"),
                        Convert.ToInt32(Math.Floor(ParseDecimalSafe(GetValueFromSelectedNguyenLieu("soLuong")))),
                        txtLoaiNguyenLieu.Text, GetDaLuuNguyenLieuDangChon().Rows.Count);
                }
                DataRow first = snapshot.Rows[0];
                string material = Convert.ToString(first["tenNguyenLieu"]);
                if (MessageBox.Show((retry ? "Gửi tiếp nguyên liệu đang lưu dở: " : "Lưu nguyên liệu: ") + material +
                    Environment.NewLine + "Kế hoạch: " + first["KeHoachId"] + Environment.NewLine +
                    "Số batch: " + snapshot.Rows.Count + Environment.NewLine + "Lưu SQL Server và Google Sheet?",
                    "Xác nhận lưu từng nguyên liệu", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;

                _dangLuuCan = true;
                btnThemDLCan.Enabled = false;
                btnXacNhanLuuCanNL.Enabled = false;
                if (!retry)
                {
                    // Persist before external writes so restarting can resume this exact snapshot.
                    Directory.CreateDirectory(Path.GetDirectoryName(PendingCanPath));
                    snapshot.TableName = "ChiTietCanBatch";
                    snapshot.ExtendedProperties["SavedAt"] = DateTime.Now.ToString("o");
                    snapshot.WriteXml(PendingCanPath + ".tmp", XmlWriteMode.WriteSchema);
                    File.Move(PendingCanPath + ".tmp", PendingCanPath);
                }
                int sqlRows = await Task.Run(() => _chiTietCanBatchService.SaveToSqlServer(snapshot));
                AppendLog("- SQL: " + sqlRows + " dòng mới; nguyên liệu " + material);

                DataTable toSend = snapshot.Copy();
                if (toSend.Columns.Contains("loaiNguyenLieu")) toSend.Columns.Remove("loaiNguyenLieu");
                if (retry)
                {
                    DateTime savedAt;
                    if (!DateTime.TryParse(Convert.ToString(snapshot.ExtendedProperties["SavedAt"]), out savedAt))
                        throw new Exception("Không xác định được thời gian bản lưu dở.");
                    int days = Math.Max(2, (DateTime.Today - savedAt.Date).Days + 2);
                    DataTable saved = await _apiService.GetChiTietCanBatchRecentDaysAsync(days);
                    if (saved.Rows.Count > 0 && !saved.Columns.Contains("IdBatch"))
                        throw new Exception("API đọc dữ liệu cân thiếu IdBatch, chưa thể kiểm tra lần gửi trước.");
                    foreach (DataRow row in toSend.Select())
                        if (saved.AsEnumerable().Any(old => NguyenLieuCanSave.Same(old, "IdBatch", Convert.ToString(row["IdBatch"]))))
                            toSend.Rows.Remove(row);
                }
                int sheetRows = toSend.Rows.Count == 0 ? 0 : await _apiService.SaveChiTietCanBatchAsync(toSend);
                if (sheetRows != toSend.Rows.Count)
                    throw new Exception("Số dòng Google Sheet xác nhận không khớp. Bản lưu dở được giữ để kiểm tra/gửi lại.");
                File.Delete(PendingCanPath);
                if (_dtChiTietCan != null)
                    foreach (DataRow row in _dtChiTietCan.Select())
                        if (snapshot.AsEnumerable().Any(saved => NguyenLieuCanSave.Same(saved, "IdBatch", Convert.ToString(row["IdBatch"]))))
                            _dtChiTietCan.Rows.Remove(row);
                txtNoiDungQRBatch.Clear();
                CapNhatTrangThaiNguyenLieuDaLuu();
                MessageBox.Show("Đã lưu nguyên liệu: " + material + Environment.NewLine +
                    "Số batch vừa lưu: " + snapshot.Rows.Count + ". Có thể cân tiếp các batch hoặc nguyên liệu còn thiếu.");
            }
            catch (Exception ex)
            {
                AppendLog("- Lỗi lưu nguyên liệu: " + ex.Message);
                MessageBox.Show(ex.Message + (File.Exists(PendingCanPath) ?
                    Environment.NewLine + "Đã giữ bản lưu trên máy. Bấm Xác nhận lưu cân để thử gửi tiếp, kể cả sau khi mở lại phần mềm." : ""),
                    "Chưa hoàn tất lưu", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            finally
            {
                _dangLuuCan = false;
                btnThemDLCan.Enabled = wasAddEnabled;
                btnXacNhanLuuCanNL.Enabled = true;
                CapNhatKhoaNguyenLieuDangChon();
            }
        }

        private DataTable GetDaLuuNguyenLieuDangChon()
        {
            return _sqlDataService.GetDaLuuNguyenLieuCan(
                GetValueFromSelectedNguyenLieu("PhieuXuatId"), GetValueFromSelectedNguyenLieu("KeHoachId"),
                GetValueFromSelectedNguyenLieu("tenBaiLieu"), GetValueFromSelectedNguyenLieu("STT"),
                GetValueFromSelectedNguyenLieu("maNguyenLieu"));
        }

        private void CapNhatKhoaNguyenLieuDangChon()
        {
            try
            {
                bool hasPending = File.Exists(PendingCanPath);
                int required = Convert.ToInt32(Math.Floor(ParseDecimalSafe(GetValueFromSelectedNguyenLieu("soLuong"))));
                bool canContinue = _selectedNguyenLieuCanRow != null && required > 0 &&
                    GetDaLuuNguyenLieuDangChon().Rows.Count < required;
                btnThemDLCan.Enabled = !_dangLuuCan && !hasPending && canContinue;
                btnXacNhanLuuCanNL.Enabled = !_dangLuuCan && (hasPending || canContinue);
            }
            catch (Exception ex)
            {
                btnThemDLCan.Enabled = false;
                btnXacNhanLuuCanNL.Enabled = !_dangLuuCan && File.Exists(PendingCanPath);
                AppendLog("- Không xác định được trạng thái batch đã lưu: " + ex.Message);
            }
        }

        private void CapNhatTrangThaiNguyenLieuDaLuu()
        {
            foreach (DataGridViewRow row in dgvNguyenLieuCan.Rows)
            {
                var drv = row.DataBoundItem as DataRowView;
                if (drv == null) continue;
                int savedCount = _sqlDataService.GetDaLuuNguyenLieuCan(GetDataRowViewValue(drv, "PhieuXuatId"),
                    GetDataRowViewValue(drv, "KeHoachId"), GetDataRowViewValue(drv, "tenBaiLieu"),
                    GetDataRowViewValue(drv, "STT"), GetDataRowViewValue(drv, "maNguyenLieu")).Rows.Count;
                int required = Convert.ToInt32(Math.Floor(ParseDecimalSafe(GetDataRowViewValue(drv, "soLuong"))));
                bool complete = required > 0 && savedCount >= required;
                row.DefaultCellStyle.BackColor = complete ? Color.LightGreen : savedCount > 0 ? Color.LightYellow : Color.White;
                row.ErrorText = "Đã lưu " + savedCount + "/" + required + " batch" + (complete ? " - Đã đủ, khóa cân" : " - Còn được cân tiếp");
            }
        }

        private void cbbCOMCanBan_Click(object sender, EventArgs e)
        {
            LoadComToComboBox(cbbCOMCanBan);
        }

        private void cbbCOMCan6kg_Click(object sender, EventArgs e)
        {
            LoadComToComboBox(cbbCOMCan6kg);
        }

        private void cbbCOMCanPhanTich_Click(object sender, EventArgs e)
        {
            LoadComToComboBox(cbbCOMCanPhanTich);
        }

        private void LoadComToComboBox(ComboBox comboBox)
        {
            try
            {
                if (comboBox == null) return;

                string selectedCom = comboBox.Text;

                comboBox.Items.Clear();

                string[] ports = SerialPort.GetPortNames()
                    .OrderBy(p => GetComNumber(p))
                    .ToArray();

                if (ports.Length == 0)
                {
                    comboBox.Items.Add("Không tìm thấy COM");
                    comboBox.SelectedIndex = 0;

                    AppendLog("- Không tìm thấy cổng COM nào trên máy.");
                    return;
                }

                foreach (string port in ports)
                {
                    comboBox.Items.Add(port);
                }

                if (!string.IsNullOrWhiteSpace(selectedCom) && ports.Contains(selectedCom))
                {
                    comboBox.Text = selectedCom;
                }
                else
                {
                    comboBox.SelectedIndex = 0;
                }

                AppendLog("- Đã tải " + ports.Length + " cổng COM cho " + comboBox.Name + ": " + string.Join(", ", ports));
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không lấy được danh sách cổng COM cho " + comboBox.Name + ".\n\n" + ex.Message,
                    "Lỗi COM",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private int GetComNumber(string portName)
        {
            if (string.IsNullOrWhiteSpace(portName))
                return 9999;

            string numberText = portName.ToUpper().Replace("COM", "");

            int number;
            if (int.TryParse(numberText, out number))
                return number;

            return 9999;
        }

        private void SetCanStatusImage(Label lblStatus, bool isConnected)
        {
            if (lblStatus == null) return;

            if (isConnected)
            {
                lblStatus.Image = Properties.Resources.greeen;
            }
            else
            {
                lblStatus.Image = Properties.Resources.reed;
            }
        }
        private void btnKetNoiCan_Click(object sender, EventArgs e)
        {
            KetNoiCanTheoLuaChon();

            timerDocCan.Enabled = true;
        }

        private void KetNoiCanTheoLuaChon()
        {
            bool hasSuccess = false;

            if (ckCanBan.Checked)
            {
                bool okCanBan = KetNoiCanBan300kg();

                if (okCanBan)
                    hasSuccess = true;
            }
            else
            {
                NgatKetNoiCanBan300kg();
            }

            if (ckCan6kg.Checked)
            {
                bool okCan6kg = KetNoiCan6kg();

                if (okCan6kg)
                    hasSuccessCan6k = true;
                else
                    hasSuccessCan6k = false;
            }

            if (ckCanPhanTich.Checked)
            {
                bool okCanPhanTich = KetNoiCanPhanTich();

                if (okCanPhanTich)
                    hasSuccessCanPhanTich = true;
                else
                    hasSuccessCanPhanTich = false;
            }
            // Sau này thêm cân 6kg và cân phân tích ở đây.

            if (hasSuccess || hasSuccessCanPhanTich || hasSuccessCan6k)
            {
                MessageBox.Show(
                    "Đã kết nối cân theo lựa chọn.",
                    "Kết nối cân",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
        }
  
        private bool KetNoiCan6kg()
        {
            portCan6kg = new SerialPort(cbbCOMCan6kg.Text, 4800, Parity.None, 8, StopBits.One);
            portCan6kg.NewLine = "\r\n";

            try
            {
                portCan6kg.Open();
                MessageBox.Show("Đã kết nối " + cbbCOMCan6kg.Text, "Thông báo", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return true;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Lỗi mở COM: " + ex.Message);
                return false;
            }
        }
        private bool KetNoiCanPhanTich()
        {
            portCanPhanTich = new SerialPort(cbbCOMCanPhanTich.Text, 4800, Parity.None, 8, StopBits.One);
            portCanPhanTich.NewLine = "\r\n";

            try
            {
                portCanPhanTich.Open();
                MessageBox.Show("Đã kết nối " + cbbCOMCanPhanTich.Text, "Thông báo", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return true;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Lỗi mở COM: " + ex.Message);
                return false;
            }
        }
        private bool KetNoiCanBan300kg()
        {
            try
            {
                string portName = (cbbCOMCanBan.Text ?? "").Trim();

                if (string.IsNullOrWhiteSpace(portName) || portName == "Không tìm thấy COM")
                {
                    MessageBox.Show(
                        "Vui lòng chọn cổng COM cho Cân bàn 300kg.",
                        "Thiếu COM",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );

                    SetCanStatusImage(lblStatusCanBan, false);
                    return false;
                }

                NgatKetNoiCanBan300kg();

                lock (_lockCanBan)
                {
                    _bufferCanBan = "";
                    _latestCanBanValue = null;
                    _lastShownCanBanValue = null;
                }

                _serialCanBan = new SerialPort();

                _serialCanBan.PortName = portName;
                _serialCanBan.BaudRate = 19200;
                _serialCanBan.DataBits = 8;
                _serialCanBan.Parity = Parity.None;
                _serialCanBan.StopBits = StopBits.One;
                _serialCanBan.Handshake = Handshake.None;

                // Một số USB-RS232 cần bật 2 dòng này.
                _serialCanBan.DtrEnable = true;
                _serialCanBan.RtsEnable = true;

                _serialCanBan.ReadTimeout = 100;
                _serialCanBan.WriteTimeout = 100;
                _serialCanBan.ReadBufferSize = 4096;
                _serialCanBan.ReceivedBytesThreshold = 1;

                _serialCanBan.DataReceived += serialCanBan_DataReceived;

                _serialCanBan.Open();

                if (_serialCanBan.IsOpen)
                {
                    SetCanStatusImage(lblStatusCanBan, true);
                    AppendLog("- Cân bàn 300kg: kết nối thành công " + portName);

                    _timerCanBanUi.Start();

                    return true;
                }

                SetCanStatusImage(lblStatusCanBan, false);
                AppendLog("- Cân bàn 300kg: kết nối thất bại " + portName);

                return false;
            }
            catch (Exception ex)
            {
                SetCanStatusImage(lblStatusCanBan, false);

                MessageBox.Show(
                    "Không kết nối được Cân bàn 300kg." + Environment.NewLine +
                    "COM: " + cbbCOMCanBan.Text + Environment.NewLine + Environment.NewLine +
                    ex.Message,
                    "Lỗi kết nối cân bàn",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLog("- Cân bàn 300kg: lỗi kết nối " + ex.Message);

                return false;
            }
        }

        private void serialCanBan_DataReceived(object sender, SerialDataReceivedEventArgs e)
        {
            try
            {
                SerialPort sp = sender as SerialPort;

                if (sp == null || !sp.IsOpen)
                    return;

                string data = sp.ReadExisting();

                if (string.IsNullOrEmpty(data))
                    return;

                lock (_lockCanBan)
                {
                    _bufferCanBan += data;

                    if (_bufferCanBan.Length > 3000)
                        _bufferCanBan = _bufferCanBan.Substring(_bufferCanBan.Length - 3000);

                    decimal? val = ParseCanBanAsi2025LatestValue();

                    if (val.HasValue)
                    {
                        _latestCanBanValue = val.Value;
                    }
                }
            }
            catch (Exception ex)
            {
                // Không MessageBox trong DataReceived.
                // Ghi lỗi ra Output để debug.
                System.Diagnostics.Debug.WriteLine("Lỗi DataReceived cân bàn: " + ex.Message);
            }
        }

        private decimal? ParseCanBanAsi2025LatestValue()
        {
            if (string.IsNullOrWhiteSpace(_bufferCanBan))
                return null;

            // Format thực tế Hercules:
            // $0 000012  => 0.12 kg
            // Lấy frame cuối cùng trong buffer.
            MatchCollection matches = Regex.Matches(
                _bufferCanBan,
                @"\$0\s+([+-]?\d{6,})"
            );

            if (matches.Count == 0)
            {
                if (_bufferCanBan.Length > 100)
                    _bufferCanBan = _bufferCanBan.Substring(_bufferCanBan.Length - 100);

                return null;
            }

            Match last = matches[matches.Count - 1];

            string numberText = last.Groups[1].Value;

            decimal rawValue;

            if (!decimal.TryParse(numberText, NumberStyles.Any, CultureInfo.InvariantCulture, out rawValue))
                return null;

            int removeTo = last.Index + last.Length;

            if (removeTo >= 0 && removeTo < _bufferCanBan.Length)
                _bufferCanBan = _bufferCanBan.Substring(removeTo);
            else
                _bufferCanBan = "";

            return rawValue / 100m;
        }

        private void timerCanBanUi_Tick(object sender, EventArgs e)
        {
            decimal? value;

            lock (_lockCanBan)
            {
                value = _latestCanBanValue;
            }

            if (!value.HasValue)
                return;

            if (_lastShownCanBanValue.HasValue && _lastShownCanBanValue.Value == value.Value)
                return;

            _lastShownCanBanValue = value.Value;

            txtValCanBan.Text = value.Value.ToString("0.##", CultureInfo.InvariantCulture);
            //SetCanStatusImage(lblStatusCanBan, true);
        }

        private void NgatKetNoiCanBan300kg()
        {
            try
            {
                _timerCanBanUi.Stop();

                if (_serialCanBan != null)
                {
                    try
                    {
                        _serialCanBan.DataReceived -= serialCanBan_DataReceived;
                    }
                    catch
                    {
                    }

                    if (_serialCanBan.IsOpen)
                        _serialCanBan.Close();

                    _serialCanBan.Dispose();
                    _serialCanBan = null;
                }

                lock (_lockCanBan)
                {
                    _bufferCanBan = "";
                    _latestCanBanValue = null;
                    _lastShownCanBanValue = null;
                }

                SetCanStatusImage(lblStatusCanBan, false);
            }
            catch (Exception ex)
            {
                SetCanStatusImage(lblStatusCanBan, false);
                AppendLog("- Cân bàn 300kg: lỗi ngắt kết nối " + ex.Message);
            }
        }
         

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            NgatKetNoiCanBan300kg();

            if (_frmScadaMain != null && !_frmScadaMain.IsDisposed)
            {
                _frmScadaMain.Close();
            }
        }
           
        private void ketnoiCanBan()
        {
            bool hasSuccess = false;

            if (ckCanBan.Checked)
            {
                bool okCanBan = KetNoiCanBan300kg();

                if (okCanBan)
                    hasSuccess = true;
            }
            else
            {
                NgatKetNoiCanBan300kg();
            }

            // Sau này thêm cân 6kg và cân phân tích ở đây

            if (hasSuccess)
            {
                MessageBox.Show(
                    "Đã kết nối cân theo lựa chọn.",
                    "Kết nối cân",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
        }
 

        private async void tabControl1_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (tabControl1.SelectedTab == tabPageXacNhanTronLieu)
            {
                if (!_daLoadChiTietCanBatch_SX)
                {
                    await LoadChiTietCanBatchFromGoogleSheet_SX_Async();
                    _daLoadChiTietCanBatch_SX = true;
                }
            }
        }

        private async Task LoadChiTietCanBatchFromGoogleSheet_SX_Async()
        {
            try
            {
                dgvKeHoachSanXuat_SX.DataSource = null;
                dgvNguyenLieuCan_SX.DataSource = null;

                AppendLog_SX("- Đang tải ChiTietCanBatch 5 ngày gần nhất từ Google Sheet...");
                _dtChiTietCanBatchRecent_SX = await _apiService.GetChiTietCanBatchRecentDaysAsync(5);

                AppendLog_SX("- Đang tải chiTietTronLieuSanXuat 5 ngày gần nhất từ Google Sheet...");
                _dtChiTietTronLieuSanXuatRecent_SX = await _apiService.GetChiTietTronLieuSanXuatRecentDaysAsync(5);

                _dtKeHoach_SX = BuildKeHoachTableFromChiTietCanBatch_SX(_dtChiTietCanBatchRecent_SX);

                ShowKeHoachSanXuatFromDataTable_SX(_dtKeHoach_SX);

                AppendLog_SX("- Đã tải " + _dtChiTietCanBatchRecent_SX.Rows.Count + " dòng ChiTietCanBatch.");
                AppendLog_SX("- Đã tải " + _dtChiTietTronLieuSanXuatRecent_SX.Rows.Count + " dòng chiTietTronLieuSanXuat.");
                AppendLog_SX("- Có " + _dtKeHoach_SX.Rows.Count + " kế hoạch trong 5 ngày gần nhất.");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tải được dữ liệu xác nhận trộn liệu từ Google Sheet." +
                    Environment.NewLine + Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private DataTable BuildKeHoachTableFromChiTietCanBatch_SX(DataTable dtSource)
        {
            DataTable dt = new DataTable();

            dt.Columns.Add("KeHoachId", typeof(string));
            dt.Columns.Add("tenBaiLieu", typeof(string));
            dt.Columns.Add("soLuong", typeof(string));
            dt.Columns.Add("NgaySanXuat", typeof(string));
            dt.Columns.Add("TongNguyenLieu", typeof(string));
            dt.Columns.Add("TongDongCan", typeof(string));
            dt.Columns.Add("ThoiGianCanDauTien", typeof(string));
            dt.Columns.Add("ThoiGianCanCuoi", typeof(string));

            if (dtSource == null || dtSource.Rows.Count == 0)
                return dt;

            Dictionary<string, List<DataRow>> groups = new Dictionary<string, List<DataRow>>();

            foreach (DataRow row in dtSource.Rows)
            {
                string keHoachId = GetRowValue_SX(row, "KeHoachId");
                string tenBaiLieu = GetRowValue_SX(row, "tenBaiLieu");

                if (string.IsNullOrWhiteSpace(keHoachId))
                    continue;

                string key = keHoachId.Trim().ToUpper() + "|" + tenBaiLieu.Trim().ToUpper();

                if (!groups.ContainsKey(key))
                    groups[key] = new List<DataRow>();

                groups[key].Add(row);
            }

            foreach (KeyValuePair<string, List<DataRow>> item in groups)
            {
                List<DataRow> rows = item.Value;

                if (rows.Count == 0)
                    continue;

                DataRow first = rows[0];

                string keHoachId = GetRowValue_SX(first, "KeHoachId");
                string tenBaiLieu = GetRowValue_SX(first, "tenBaiLieu");
                string soLuong = GetRowValue_SX(first, "soLuong");
                string ngaySanXuat = GetRowValue_SX(first, "NgaySanXuat");

                int tongDongCan = rows.Count;

                HashSet<string> nguyenLieuSet = new HashSet<string>();

                DateTime? minTime = null;
                DateTime? maxTime = null;

                foreach (DataRow r in rows)
                {
                    string maNguyenLieu = GetRowValue_SX(r, "maNguyenLieu");
                    string stt = GetRowValue_SX(r, "STT");
                    string sttTron = GetRowValue_SX(r, "sttTron");

                    string nlKey = maNguyenLieu + "|" + stt + "|" + sttTron;

                    if (!string.IsNullOrWhiteSpace(nlKey))
                        nguyenLieuSet.Add(nlKey);

                    DateTime timeCan;

                    if (TryParseDateTime_SX(GetRowValue_SX(r, "thoiGianCan"), out timeCan))
                    {
                        if (!minTime.HasValue || timeCan < minTime.Value)
                            minTime = timeCan;

                        if (!maxTime.HasValue || timeCan > maxTime.Value)
                            maxTime = timeCan;
                    }
                }

                DataRow newRow = dt.NewRow();

                newRow["KeHoachId"] = keHoachId;
                newRow["tenBaiLieu"] = tenBaiLieu;
                newRow["soLuong"] = soLuong;
                newRow["NgaySanXuat"] = ngaySanXuat;
                newRow["TongNguyenLieu"] = nguyenLieuSet.Count.ToString();
                newRow["TongDongCan"] = tongDongCan.ToString();
                newRow["ThoiGianCanDauTien"] = minTime.HasValue ? minTime.Value.ToString("yyyy-MM-dd HH:mm:ss") : "";
                newRow["ThoiGianCanCuoi"] = maxTime.HasValue ? maxTime.Value.ToString("yyyy-MM-dd HH:mm:ss") : "";

                dt.Rows.Add(newRow);
            }

            return dt;
        }

        private string GetRowValue_SX(DataRow row, string columnName)
        {
            if (row == null || row.Table == null)
                return "";

            if (!row.Table.Columns.Contains(columnName))
                return "";

            object value = row[columnName];

            return value == null || value == DBNull.Value ? "" : Convert.ToString(value);
        }

        private bool TryParseDateTime_SX(string text, out DateTime value)
        {
            value = DateTime.MinValue;

            if (string.IsNullOrWhiteSpace(text))
                return false;

            text = text.Trim();

            string[] formats = new string[]
            {
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd",
        "dd/MM/yyyy HH:mm:ss",
        "dd/MM/yyyy"
            };

            return DateTime.TryParseExact(
                text,
                formats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out value
            ) || DateTime.TryParse(text, out value);
        }

        private void ShowKeHoachSanXuatFromDataTable_SX(DataTable dt)
        {
            dgvKeHoachSanXuat_SX.DataSource = null;
            dgvKeHoachSanXuat_SX.AutoGenerateColumns = false;
            dgvKeHoachSanXuat_SX.Columns.Clear();

            dgvKeHoachSanXuat_SX.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colKeHoachId_SX",
                HeaderText = "Mã kế hoạch",
                DataPropertyName = "KeHoachId",
                Width = 160
            });

            dgvKeHoachSanXuat_SX.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colTenBaiLieu_SX",
                HeaderText = "Tên bài liệu",
                DataPropertyName = "tenBaiLieu",
                AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
            });

            dgvKeHoachSanXuat_SX.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colSoLuong_SX",
                HeaderText = "Số mẻ",
                DataPropertyName = "soLuong",
                Width = 80
            });

            dgvKeHoachSanXuat_SX.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colNgaySanXuat_SX",
                HeaderText = "Ngày SX",
                DataPropertyName = "NgaySanXuat",
                Width = 110
            });

            dgvKeHoachSanXuat_SX.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colTongNguyenLieu_SX",
                HeaderText = "Số NL",
                DataPropertyName = "TongNguyenLieu",
                Width = 80
            });

            dgvKeHoachSanXuat_SX.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = "colTongDongCan_SX",
                HeaderText = "Dòng cân",
                DataPropertyName = "TongDongCan",
                Width = 90
            });

            dgvKeHoachSanXuat_SX.DataSource = dt;
            dgvKeHoachSanXuat_SX.ClearSelection();
        }

        private void dgvKeHoachSanXuat_SX_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0) return;

            DataGridViewRow row = dgvKeHoachSanXuat_SX.Rows[e.RowIndex];

            string keHoachId = Convert.ToString(row.Cells["colKeHoachId_SX"].Value);
            string tenBaiLieu = Convert.ToString(row.Cells["colTenBaiLieu_SX"].Value);

            if (string.IsNullOrWhiteSpace(keHoachId))
            {
                MessageBox.Show(
                    "Không lấy được KeHoachId của kế hoạch được chọn.",
                    "Thiếu dữ liệu",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            _selectedKeHoachId_SX = keHoachId;
            _selectedTenBaiLieu_SX = tenBaiLieu;

            showThongTinKeHoach_SX(row);

            ShowNguyenLieuCan_SX(keHoachId);

            int soLuongKeHoach = GetSoLuongKeHoach_SX(keHoachId);

            _meTronDangThucHien_SX = GetMeTronDangThucHien_SX(keHoachId);

            if (soLuongKeHoach > 0 && _meTronDangThucHien_SX > soLuongKeHoach)
            {
                _idMeTronHienTai_SX = "";

                txtIdMeTron_SX.Clear();
                txtMeTronDangThucHien_SX.Clear();

                AppendLog_SX(
                    "- Kế hoạch " + keHoachId +
                    " đã hoàn thành đủ " + soLuongKeHoach + "/" + soLuongKeHoach + " mẻ."
                );

                MessageBox.Show(
                    "Kế hoạch này đã hoàn thành đủ " + soLuongKeHoach + " mẻ trộn.",
                    "Đã hoàn thành",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                return;
            }

            _idMeTronHienTai_SX = GenerateIdMeTron_SX();

            txtIdMeTron_SX.Text = _idMeTronHienTai_SX;
            txtMeTronDangThucHien_SX.Text = _meTronDangThucHien_SX.ToString();

            EnsureTronLieuBatchTable_SX();
            _dtTronLieuBatch_SX.Clear();
            dgvTronLieuBatch.DataSource = _dtTronLieuBatch_SX;

            _selectedNguyenLieuCanRow_SX = null;
            _sttTronDangCho_SX = GetSttTronDangChoTiepTheo_SX();

            txtScanBatch_SX.Clear();
            txtScanBatch_SX.Focus();

            AppendLog_SX(
                "- Đã chọn kế hoạch " + keHoachId +
                ". Đang thực hiện mẻ " + _meTronDangThucHien_SX +
                "/" + soLuongKeHoach +
                ". IdMeTron: " + _idMeTronHienTai_SX
            );

        }

        private void showThongTinKeHoach_SX(DataGridViewRow row)
        {
            if (row == null) return;

            string keHoachId = Convert.ToString(row.Cells["colKeHoachId_SX"].Value);
            string tenBaiLieu = Convert.ToString(row.Cells["colTenBaiLieu_SX"].Value);
            string soLuong = Convert.ToString(row.Cells["colSoLuong_SX"].Value);
            string ngaySanXuat = Convert.ToString(row.Cells["colNgaySanXuat_SX"].Value);
            string tongNguyenLieu = Convert.ToString(row.Cells["colTongNguyenLieu_SX"].Value);
            string tongDongCan = Convert.ToString(row.Cells["colTongDongCan_SX"].Value);

            string thoiGianCanDauTien = "";
            string thoiGianCanCuoi = "";

            DataRowView drv = row.DataBoundItem as DataRowView;

            if (drv != null)
            {
                if (drv.Row.Table.Columns.Contains("ThoiGianCanDauTien"))
                    thoiGianCanDauTien = Convert.ToString(drv["ThoiGianCanDauTien"]);

                if (drv.Row.Table.Columns.Contains("ThoiGianCanCuoi"))
                    thoiGianCanCuoi = Convert.ToString(drv["ThoiGianCanCuoi"]);
            }

            txtThongTinKeHoach_SX.Multiline = true;
            txtThongTinKeHoach_SX.WordWrap = true;
            txtThongTinKeHoach_SX.ScrollBars = ScrollBars.Vertical;
            txtThongTinKeHoach_SX.ReadOnly = true;

            txtThongTinKeHoach_SX.Text =
                "- Mã kế hoạch: " + keHoachId + Environment.NewLine +
                "- Tên bài liệu: " + tenBaiLieu + Environment.NewLine +
                "- Ngày sản xuất: " + ngaySanXuat + Environment.NewLine +
                "- Số mẻ kế hoạch: " + soLuong + Environment.NewLine +
                "- Tổng nguyên liệu: " + tongNguyenLieu + Environment.NewLine +
                "- Tổng dòng đã cân: " + tongDongCan + Environment.NewLine +
                "- Cân đầu tiên: " + thoiGianCanDauTien + Environment.NewLine +
                "- Cân cuối cùng: " + thoiGianCanCuoi;
        }

        private async void btnTaiLaiDuLieu_SX_Click(object sender, EventArgs e)
        {
            _daLoadChiTietCanBatch_SX = false;
            await LoadChiTietCanBatchFromGoogleSheet_SX_Async();
            _daLoadChiTietCanBatch_SX = true;
        }
        private void ShowNguyenLieuCan_SX(string keHoachId)
        {
            try
            {
                if (_dtChiTietCanBatchRecent_SX == null || _dtChiTietCanBatchRecent_SX.Rows.Count == 0)
                {
                    dgvNguyenLieuCan_SX.DataSource = null;
                    AppendLog_SX("- Chưa có dữ liệu ChiTietCanBatch để hiển thị nguyên liệu.");
                    return;
                }

                DataTable dtNguyenLieu = BuildNguyenLieuCanTable_SX(keHoachId);

                dgvNguyenLieuCan_SX.DataSource = null;
                dgvNguyenLieuCan_SX.AutoGenerateColumns = false;
                dgvNguyenLieuCan_SX.Columns.Clear();

                dgvNguyenLieuCan_SX.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colSttTron_SX",
                    HeaderText = "Stt trộn",
                    DataPropertyName = "sttTron",
                    Width = 90
                });

                dgvNguyenLieuCan_SX.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colTenNguyenLieu_SX",
                    HeaderText = "Tên nguyên liệu",
                    DataPropertyName = "tenNguyenLieu",
                    Visible = false
                });

                dgvNguyenLieuCan_SX.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colMaNguyenLieu_SX",
                    HeaderText = "Mã nguyên liệu",
                    DataPropertyName = "maNguyenLieu",
                    AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
                });

                dgvNguyenLieuCan_SX.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colSoMe_SX",
                    HeaderText = "Số mẻ",
                    DataPropertyName = "soMe",
                    Width = 80
                });

                dgvNguyenLieuCan_SX.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colKhoiLuong_SX",
                    HeaderText = "Khối lượng",
                    DataPropertyName = "KhoiLuong",
                    Width = 110
                });

                dgvNguyenLieuCan_SX.Columns.Add(new DataGridViewTextBoxColumn
                {
                    Name = "colDonVi_SX",
                    HeaderText = "Đơn vị",
                    DataPropertyName = "donVi",
                    Width = 80
                });

                dgvNguyenLieuCan_SX.DataSource = dtNguyenLieu;
                dgvNguyenLieuCan_SX.ClearSelection();
                HighlightNguyenLieuDaQuet_SX();

                AppendLog_SX("- Đã hiển thị " + dtNguyenLieu.Rows.Count +
                    " nguyên liệu của kế hoạch " + keHoachId + ".");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không hiển thị được danh sách nguyên liệu cần xác nhận." +
                    Environment.NewLine + Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private DataTable BuildNguyenLieuCanTable_SX(string keHoachId)
        {
            DataTable dt = new DataTable();

            dt.Columns.Add("sttTron", typeof(string));
            dt.Columns.Add("tenNguyenLieu", typeof(string));
            dt.Columns.Add("maNguyenLieu", typeof(string));
            dt.Columns.Add("soMe", typeof(string));
            dt.Columns.Add("KhoiLuong", typeof(string));
            dt.Columns.Add("donVi", typeof(string));

            // Các cột phụ để dùng cho bước quét barcode sau này
            dt.Columns.Add("KeHoachId", typeof(string));
            dt.Columns.Add("tenBaiLieu", typeof(string));
            dt.Columns.Add("STT", typeof(string));

            if (_dtChiTietCanBatchRecent_SX == null || _dtChiTietCanBatchRecent_SX.Rows.Count == 0)
                return dt;

            Dictionary<string, List<DataRow>> groups = new Dictionary<string, List<DataRow>>();

            foreach (DataRow row in _dtChiTietCanBatchRecent_SX.Rows)
            {
                string rowKeHoachId = GetRowValue_SX(row, "KeHoachId");

                if (!string.Equals(rowKeHoachId, keHoachId, StringComparison.OrdinalIgnoreCase))
                    continue;

                string sttTron = GetRowValue_SX(row, "sttTron");
                string maNguyenLieu = GetRowValue_SX(row, "maNguyenLieu");
                string tenNguyenLieu = GetRowValue_SX(row, "tenNguyenLieu");
                string stt = GetRowValue_SX(row, "STT");

                string key =
                    sttTron.Trim().ToUpper() + "|" +
                    maNguyenLieu.Trim().ToUpper() + "|" +
                    tenNguyenLieu.Trim().ToUpper() + "|" +
                    stt.Trim().ToUpper();

                if (!groups.ContainsKey(key))
                    groups[key] = new List<DataRow>();

                groups[key].Add(row);
            }

            List<DataRow> sortedFirstRows = new List<DataRow>();

            foreach (KeyValuePair<string, List<DataRow>> item in groups)
            {
                if (item.Value.Count > 0)
                    sortedFirstRows.Add(item.Value[0]);
            }

            sortedFirstRows = sortedFirstRows
                .OrderBy(r => ParseIntSafe_SX(GetRowValue_SX(r, "sttTron")))
                .ThenBy(r => ParseIntSafe_SX(GetRowValue_SX(r, "STT")))
                .ToList();

            foreach (DataRow first in sortedFirstRows)
            {
                string sttTron = GetRowValue_SX(first, "sttTron");
                string tenNguyenLieu = GetRowValue_SX(first, "tenNguyenLieu");
                string maNguyenLieu = GetRowValue_SX(first, "maNguyenLieu");
                string khoiLuong = GetRowValue_SX(first, "KhoiLuong");
                string donVi = GetDonViFromChiTietCanBatchRow_SX(first);
                string stt = GetRowValue_SX(first, "STT");
                string tenBaiLieu = GetRowValue_SX(first, "tenBaiLieu");

                string groupKey =
                    sttTron.Trim().ToUpper() + "|" +
                    maNguyenLieu.Trim().ToUpper() + "|" +
                    tenNguyenLieu.Trim().ToUpper() + "|" +
                    stt.Trim().ToUpper();

                int soMe = groups.ContainsKey(groupKey) ? groups[groupKey].Count : 0;

                DataRow newRow = dt.NewRow();

                newRow["sttTron"] = sttTron;
                newRow["tenNguyenLieu"] = tenNguyenLieu;
                newRow["maNguyenLieu"] = maNguyenLieu;
                newRow["soMe"] = soMe.ToString();
                newRow["KhoiLuong"] = khoiLuong;
                newRow["donVi"] = donVi;

                newRow["KeHoachId"] = keHoachId;
                newRow["tenBaiLieu"] = tenBaiLieu;
                newRow["STT"] = stt;

                dt.Rows.Add(newRow);
            }

            return dt;
        }

        private string GetDonViFromChiTietCanBatchRow_SX(DataRow row)
        {
            string donVi = GetRowValue_SX(row, "donVi");

            if (!string.IsNullOrWhiteSpace(donVi))
                return donVi;

            donVi = GetRowValue_SX(row, "donViCanXuat");

            if (!string.IsNullOrWhiteSpace(donVi))
                return donVi;

            donVi = GetRowValue_SX(row, "donViKho");

            if (!string.IsNullOrWhiteSpace(donVi))
                return donVi;

            return "";
        }

        private int ParseIntSafe_SX(string text)
        {
            int value;

            if (int.TryParse((text ?? "").Trim(), out value))
                return value;

            return 999999;
        }

        private void AppendLog_SX(string message)
        {
            if (txtLogThaoTac_SX == null) return;

            txtLogThaoTac_SX.AppendText(
                DateTime.Now.ToString("HH:mm:ss") + " " + message + Environment.NewLine
            );

            txtLogThaoTac_SX.SelectionStart = txtLogThaoTac_SX.Text.Length;
            txtLogThaoTac_SX.ScrollToCaret();
        }
        private string GenerateIdMeTron_SX()
        {
            return "M" + DateTime.Now.ToString("yyyyMMddHHmmssfff");
        }

        private int GetSoLuongKeHoach_SX(string keHoachId)
        {
            if (_dtKeHoach_SX == null)
                return 0;

            foreach (DataRow row in _dtKeHoach_SX.Rows)
            {
                string rowKeHoachId = GetRowValue_SX(row, "KeHoachId");

                if (!string.Equals(rowKeHoachId, keHoachId, StringComparison.OrdinalIgnoreCase))
                    continue;

                int soLuong;
                if (int.TryParse(GetRowValue_SX(row, "soLuong"), out soLuong))
                    return soLuong;
            }

            return 0;
        }
        private int GetMeTronDangThucHien_SX(string keHoachId)
        {
            if (_dtChiTietTronLieuSanXuatRecent_SX == null ||
                _dtChiTietTronLieuSanXuatRecent_SX.Rows.Count == 0)
                return 1;

            int maxMeDaLuu = 0;

            foreach (DataRow row in _dtChiTietTronLieuSanXuatRecent_SX.Rows)
            {
                string rowKeHoachId = GetRowValue_SX(row, "KeHoachId");

                if (!string.Equals(rowKeHoachId, keHoachId, StringComparison.OrdinalIgnoreCase))
                    continue;

                string meText = GetRowValue_SX(row, "MeTronDaThucHien");

                int me;
                if (int.TryParse((meText ?? "").Trim(), out me))
                {
                    if (me > maxMeDaLuu)
                        maxMeDaLuu = me;
                }
            }

            return maxMeDaLuu + 1;
        }

        private void dgvNguyenLieuCan_SX_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0) return;

            DataGridViewRow row = dgvNguyenLieuCan_SX.Rows[e.RowIndex];

            _selectedNguyenLieuCanRow_SX = row.DataBoundItem as DataRowView;

            if (_selectedNguyenLieuCanRow_SX == null)
                return;

            string sttTron = GetDataRowViewValue_SX(_selectedNguyenLieuCanRow_SX, "sttTron");
            string tenNguyenLieu = GetDataRowViewValue_SX(_selectedNguyenLieuCanRow_SX, "tenNguyenLieu");
            string maNguyenLieu = GetDataRowViewValue_SX(_selectedNguyenLieuCanRow_SX, "maNguyenLieu");

            AppendLog_SX(
                "- Đã chọn nguyên liệu: STT trộn " + sttTron +
                " | Mã: " + maNguyenLieu
            );

            txtScanBatch_SX.Clear();
            txtScanBatch_SX.Focus();
        }

        private void txtScanBatch_SX_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode != Keys.Enter)
                return;

            e.SuppressKeyPress = true;

            TaoBarcodeChoScanBatch_SX();

            XuLyQuetBatch_SX();
        }

        private string GetDataRowViewValue_SX(DataRowView drv, string columnName)
        {
            if (drv == null || drv.Row == null || drv.Row.Table == null)
                return "";

            if (!drv.Row.Table.Columns.Contains(columnName))
                return "";

            object value = drv[columnName];

            return value == null || value == DBNull.Value ? "" : Convert.ToString(value);
        }
        private void EnsureTronLieuBatchTable_SX()
        {
            if (_dtTronLieuBatch_SX != null)
                return;

            _dtTronLieuBatch_SX = new DataTable();

            string[] extraColumns = new string[]
            {
                "IdMeTron",
                "MeTronDaThucHien",
                "TrangThaiBatch",
                "nguoiXacNhanTron",
                "thoiGianXacNhanTron",
                "ghiChu"
            };

            foreach (string col in extraColumns)
            {
                if (!_dtTronLieuBatch_SX.Columns.Contains(col))
                    _dtTronLieuBatch_SX.Columns.Add(col, typeof(string));
            }

            if (_dtChiTietCanBatchRecent_SX != null)
            {
                foreach (DataColumn col in _dtChiTietCanBatchRecent_SX.Columns)
                {
                    if (!_dtTronLieuBatch_SX.Columns.Contains(col.ColumnName))
                        _dtTronLieuBatch_SX.Columns.Add(col.ColumnName, typeof(string));
                }
            }
            else
            {
                string[] chiTietCanColumns = new string[]
                {
                    "PhieuXuatId",
                    "KeHoachId",
                    "tenBaiLieu",
                    "soLuong",
                    "NgaySanXuat",
                    "STT",
                    "maNguyenLieu",
                    "tenNguyenLieu",
                    "khoiLuongCanXuat",
                    "donViCanXuat",
                    "sttTron",
                    "canSuDung",
                    "IdKho",
                    "khoiLuongKho",
                    "donViKho",
                    "quyCachDongGoi",
                    "LotNo",
                    "ngaySanXuatKho",
                    "hanSuDung",
                    "nhaCungCap",
                    "ngayNhap",
                    "nguoiTao",
                    "ngayTao",
                    "trangThaiPheDuyet",
                    "cachXuat",
                    "nguoiPheDuyet",
                    "thoiGianDuyet",
                    "IdKhoDaTru",
                    "IdTuKhoDenBatch",
                    "KhoiLuong",
                    "SttBatchNL",
                    "IdBatch",
                    "khoiLuongThucTe",
                    "saiSo",
                    "nguoiCan",
                    "thoiGianCan"
                };

                foreach (string col in chiTietCanColumns)
                {
                    if (!_dtTronLieuBatch_SX.Columns.Contains(col))
                        _dtTronLieuBatch_SX.Columns.Add(col, typeof(string));
                }
            }

            dgvTronLieuBatch.AutoGenerateColumns = true;
            dgvTronLieuBatch.DataSource = _dtTronLieuBatch_SX;

            SetupGridStyle(dgvTronLieuBatch);
            AnCotTenNguyenLieuTrongTronLieuBatch();
        }

        private void XuLyQuetBatch_SX()
        {
            try
            {
                string idBatchScan = (txtScanBatch_SX.Text ?? "").Trim();

                if (string.IsNullOrWhiteSpace(idBatchScan))
                {
                    MessageBox.Show(
                        "Chưa có mã Batch. Vui lòng quét barcode.",
                        "Thiếu Batch",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    txtScanBatch_SX.Focus();
                    return;
                }

                if (string.IsNullOrWhiteSpace(_selectedKeHoachId_SX))
                {
                    MessageBox.Show(
                        "Vui lòng chọn kế hoạch sản xuất trước.",
                        "Chưa chọn kế hoạch",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    txtScanBatch_SX.Clear();
                    return;
                }

                if (_selectedNguyenLieuCanRow_SX == null)
                {
                    MessageBox.Show(
                        "Vui lòng chọn nguyên liệu cần xác nhận trước.",
                        "Chưa chọn nguyên liệu",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    txtScanBatch_SX.Clear();
                    return;
                }

                if (string.IsNullOrWhiteSpace(_idMeTronHienTai_SX))
                {
                    MessageBox.Show(
                        "Chưa có IdMeTron. Vui lòng chọn lại kế hoạch sản xuất.",
                        "Thiếu IdMeTron",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    txtScanBatch_SX.Clear();
                    return;
                }

                DataRow batchRow = FindBatchInChiTietCanBatch_SX(idBatchScan);

                if (batchRow == null)
                {
                    BaoSaiBatch_SX("Không tìm thấy mã Batch trong ChiTietCanBatch: " + idBatchScan);
                    return;
                }

                string batchKeHoachId = GetRowValue_SX(batchRow, "KeHoachId");
                string batchMaNguyenLieu = GetRowValue_SX(batchRow, "maNguyenLieu");
                string batchTenNguyenLieu = GetRowValue_SX(batchRow, "tenNguyenLieu");
                string batchSttTron = GetRowValue_SX(batchRow, "sttTron"); 

                string selectedMaNguyenLieu = GetDataRowViewValue_SX(_selectedNguyenLieuCanRow_SX, "maNguyenLieu");
                string selectedTenNguyenLieu = GetDataRowViewValue_SX(_selectedNguyenLieuCanRow_SX, "tenNguyenLieu");
                string selectedSttTron = GetDataRowViewValue_SX(_selectedNguyenLieuCanRow_SX, "sttTron");

                if (!string.Equals(batchKeHoachId, _selectedKeHoachId_SX, StringComparison.OrdinalIgnoreCase))
                {
                    BaoSaiBatch_SX(
                        "Batch không thuộc kế hoạch đang chọn." + Environment.NewLine +
                        "Kế hoạch đang chọn: " + _selectedKeHoachId_SX + Environment.NewLine +
                        "Batch thuộc kế hoạch: " + batchKeHoachId
                    );
                    return;
                }

                if (!string.Equals(batchMaNguyenLieu, selectedMaNguyenLieu, StringComparison.OrdinalIgnoreCase))
                {
                    BaoSaiBatch_SX(
                        "Sai nguyên liệu." + Environment.NewLine +
                        "Đang chọn mã: " + selectedMaNguyenLieu + Environment.NewLine +
                        "Batch quét được mã: " + batchMaNguyenLieu
                    );
                    return;
                }

                int sttTronBatch = ParseIntSafe_SX(batchSttTron);
                int sttTronSelected = ParseIntSafe_SX(selectedSttTron);
                int sttTronDangCho = GetSttTronDangChoTiepTheo_SX();

                if (sttTronBatch != sttTronSelected)
                {
                    BaoSaiBatch_SX(
                        "Batch không đúng STT trộn của nguyên liệu đang chọn." + Environment.NewLine +
                        "STT trộn đang chọn: " + sttTronSelected + Environment.NewLine +
                        "STT trộn của Batch: " + sttTronBatch
                    );
                    return;
                }

                if (sttTronBatch != sttTronDangCho)
                {
                    BaoSaiBatch_SX(
                        "Sai thứ tự trộn." + Environment.NewLine +
                        "Hiện tại phải quét nguyên liệu có STT trộn: " + sttTronDangCho + Environment.NewLine +
                        "Batch vừa quét có STT trộn: " + sttTronBatch
                    );
                    return;
                } 

                if (IsBatchAlreadyInGrid_SX(idBatchScan))
                {
                    BaoSaiBatch_SX("Batch này đã được quét trong mẻ trộn hiện tại: " + idBatchScan);
                    return;
                }

                if (IsBatchAlreadySaved_SX(idBatchScan))
                {
                    BaoSaiBatch_SX("Batch này đã được lưu trộn trước đó trên Google Sheet: " + idBatchScan);
                    return;
                }

                AddBatchToTronLieuGrid_SX(batchRow);

                AppendLog_SX(
                    "- Hợp lệ. Đã thêm Batch " + idBatchScan +
                    " | STT trộn " + sttTronBatch +
                    " | Mẻ " + _meTronDangThucHien_SX
                );

                txtScanBatch_SX.Clear();
                txtScanBatch_SX.Focus();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Lỗi xử lý quét Batch." +
                    Environment.NewLine + Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
        private DataRow FindBatchInChiTietCanBatch_SX(string idBatch)
        {
            if (_dtChiTietCanBatchRecent_SX == null)
                return null;

            foreach (DataRow row in _dtChiTietCanBatchRecent_SX.Rows)
            {
                string rowIdBatch = GetRowValue_SX(row, "IdBatch");

                if (string.Equals(rowIdBatch, idBatch, StringComparison.OrdinalIgnoreCase))
                    return row;
            }

            return null;
        }

        private bool IsBatchAlreadyInGrid_SX(string idBatch)
        {
            EnsureTronLieuBatchTable_SX();

            foreach (DataRow row in _dtTronLieuBatch_SX.Rows)
            {
                string rowIdBatch = GetRowValue_SX(row, "IdBatch");

                if (string.Equals(rowIdBatch, idBatch, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        private bool IsBatchAlreadySaved_SX(string idBatch)
        {
            if (_dtChiTietTronLieuSanXuatRecent_SX == null)
                return false;

            foreach (DataRow row in _dtChiTietTronLieuSanXuatRecent_SX.Rows)
            {
                string rowIdBatch = GetRowValue_SX(row, "IdBatch");

                if (string.Equals(rowIdBatch, idBatch, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        private void BaoSaiBatch_SX(string message)
        {
            AppendLog_SX("- KHÔNG HỢP LỆ: " + message.Replace(Environment.NewLine, " | "));

            MessageBox.Show(
                message,
                "Batch không hợp lệ",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning
            );

            txtScanBatch_SX.Clear();
            txtScanBatch_SX.Focus();
        }

        private int GetSttTronDangChoTiepTheo_SX()
        {
            EnsureTronLieuBatchTable_SX();

            if (_dtTronLieuBatch_SX.Rows.Count == 0)
                return GetMinSttTronTrongKeHoach_SX();

            int maxSttDaQuet = 0;

            foreach (DataRow row in _dtTronLieuBatch_SX.Rows)
            {
                string rowKeHoachId = GetRowValue_SX(row, "KeHoachId");
                string rowMe = GetRowValue_SX(row, "MeTronDaThucHien");

                if (!string.Equals(rowKeHoachId, _selectedKeHoachId_SX, StringComparison.OrdinalIgnoreCase))
                    continue;

                int me;
                if (!int.TryParse(rowMe, out me))
                    continue;

                if (me != _meTronDangThucHien_SX)
                    continue;

                int sttTron = ParseIntSafe_SX(GetRowValue_SX(row, "sttTron"));

                if (sttTron > maxSttDaQuet)
                    maxSttDaQuet = sttTron;
            }

            if (maxSttDaQuet <= 0)
                return GetMinSttTronTrongKeHoach_SX();

            return maxSttDaQuet + 1;
        }

        private int GetMinSttTronTrongKeHoach_SX()
        {
            if (dgvNguyenLieuCan_SX.Rows.Count == 0)
                return 1;

            int min = 999999;

            foreach (DataGridViewRow row in dgvNguyenLieuCan_SX.Rows)
            {
                if (row.IsNewRow) continue;

                object value = row.Cells["colSttTron_SX"].Value;

                int stt = ParseIntSafe_SX(Convert.ToString(value));

                if (stt < min)
                    min = stt;
            }

            if (min == 999999)
                return 1;

            return min;
        }

        private void AddBatchToTronLieuGrid_SX(DataRow batchRow)
        {
            EnsureTronLieuBatchTable_SX();

            DataRow newRow = _dtTronLieuBatch_SX.NewRow();

            SetRowValue_SX(newRow, "IdMeTron", _idMeTronHienTai_SX);
            SetRowValue_SX(newRow, "MeTronDaThucHien", _meTronDangThucHien_SX.ToString());
            SetRowValue_SX(newRow, "TrangThaiBatch", "Đã trộn");

            string nguoiXacNhan = "";

            if (AppSession.CurrentUser != null)
                nguoiXacNhan = AppSession.CurrentUser.useName;

            SetRowValue_SX(newRow, "nguoiXacNhanTron", nguoiXacNhan);
            SetRowValue_SX(newRow, "thoiGianXacNhanTron", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            SetRowValue_SX(newRow, "ghiChu", "");

            foreach (DataColumn col in batchRow.Table.Columns)
            {
                if (!_dtTronLieuBatch_SX.Columns.Contains(col.ColumnName))
                    continue;

                object value = batchRow[col.ColumnName];

                newRow[col.ColumnName] = value == null || value == DBNull.Value
                    ? ""
                    : Convert.ToString(value);
            }

            _dtTronLieuBatch_SX.Rows.Add(newRow);

            dgvTronLieuBatch.DataSource = null;
            dgvTronLieuBatch.DataSource = _dtTronLieuBatch_SX;

            SetupGridStyle(dgvTronLieuBatch);
            AnCotTenNguyenLieuTrongTronLieuBatch();

            HighlightNguyenLieuDaQuet_SX();
        }

        private void SetRowValue_SX(DataRow row, string columnName, string value)
        {
            if (row == null || row.Table == null)
                return;

            if (!row.Table.Columns.Contains(columnName))
                return;

            row[columnName] = value ?? "";
        }

        private void HighlightNguyenLieuDaQuet_SX()
        {
            int sttDangCho = GetSttTronDangChoTiepTheo_SX();

            foreach (DataGridViewRow row in dgvNguyenLieuCan_SX.Rows)
            {
                if (row.IsNewRow) continue;

                int sttTron = ParseIntSafe_SX(Convert.ToString(row.Cells["colSttTron_SX"].Value));

                if (sttTron < sttDangCho)
                {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(220, 252, 231);
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(187, 247, 208);
                }
                else if (sttTron == sttDangCho)
                {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(254, 249, 195);
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(253, 224, 71);
                }
                else
                {
                    row.DefaultCellStyle.BackColor = Color.White;
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(219, 234, 254);
                }
            }
        }

        private bool KiemTraDaQuetDuNguyenLieuTron_SX(out string message)
        {
            message = "";

            if (string.IsNullOrWhiteSpace(_selectedKeHoachId_SX))
            {
                message = "Chưa chọn kế hoạch sản xuất.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(_idMeTronHienTai_SX))
            {
                message = "Chưa có IdMeTron. Vui lòng chọn lại kế hoạch sản xuất.";
                return false;
            }

            if (dgvNguyenLieuCan_SX.Rows.Count == 0)
            {
                message = "Chưa có danh sách nguyên liệu cần trộn.";
                return false;
            }

            if (_dtTronLieuBatch_SX == null || _dtTronLieuBatch_SX.Rows.Count == 0)
            {
                message = "Chưa có batch nguyên liệu nào được quét.";
                return false;
            }

            StringBuilder sb = new StringBuilder();

            int soNguyenLieuCan = 0;
            int soNguyenLieuDaQuet = 0;

            foreach (DataGridViewRow gridRow in dgvNguyenLieuCan_SX.Rows)
            {
                if (gridRow.IsNewRow) continue;

                soNguyenLieuCan++;

                string sttTron = Convert.ToString(gridRow.Cells["colSttTron_SX"].Value);
                string maNguyenLieu = Convert.ToString(gridRow.Cells["colMaNguyenLieu_SX"].Value);
                string tenNguyenLieu = Convert.ToString(gridRow.Cells["colTenNguyenLieu_SX"].Value);

                int countMatch = 0;

                foreach (DataRow row in _dtTronLieuBatch_SX.Rows)
                {
                    string rowKeHoachId = GetRowValue_SX(row, "KeHoachId");
                    string rowIdMeTron = GetRowValue_SX(row, "IdMeTron");
                    string rowMeTron = GetRowValue_SX(row, "MeTronDaThucHien");
                    string rowSttTron = GetRowValue_SX(row, "sttTron");
                    string rowMaNguyenLieu = GetRowValue_SX(row, "maNguyenLieu");

                    bool same =
                        string.Equals(rowKeHoachId, _selectedKeHoachId_SX, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(rowIdMeTron, _idMeTronHienTai_SX, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(rowMeTron, _meTronDangThucHien_SX.ToString(), StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(rowSttTron, sttTron, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(rowMaNguyenLieu, maNguyenLieu, StringComparison.OrdinalIgnoreCase);

                    if (same)
                        countMatch++;
                }

                if (countMatch == 0)
                {
                    sb.AppendLine("- Chưa quét: STT trộn " + sttTron + " | Mã: " + maNguyenLieu);
                }
                else if (countMatch > 1)
                {
                    sb.AppendLine("- Bị trùng: STT trộn " + sttTron + " | Mã: " + maNguyenLieu + " có " + countMatch + " dòng.");
                }
                else
                {
                    soNguyenLieuDaQuet++;
                }
            }

            if (sb.Length > 0)
            {
                message =
                    "Chưa đủ nguyên liệu cho mẻ trộn." + Environment.NewLine +
                    "Đã quét: " + soNguyenLieuDaQuet + "/" + soNguyenLieuCan + Environment.NewLine +
                    Environment.NewLine +
                    sb.ToString();

                return false;
            }

            if (_dtTronLieuBatch_SX.Rows.Count != soNguyenLieuCan)
            {
                message =
                    "Số dòng trong bảng trộn liệu không khớp." + Environment.NewLine +
                    "Cần: " + soNguyenLieuCan + " dòng." + Environment.NewLine +
                    "Hiện có: " + _dtTronLieuBatch_SX.Rows.Count + " dòng.";

                return false;
            }

            message = "Đã quét đủ " + soNguyenLieuDaQuet + "/" + soNguyenLieuCan + " nguyên liệu.";
            return true;
        }

        private async void btnLuuTronLieuSanXuat_Click(object sender, EventArgs e)
        {
            try
            {
                EnsureTronLieuBatchTable_SX();

                string checkMessage;

                if (!KiemTraDaQuetDuNguyenLieuTron_SX(out checkMessage))
                {
                    MessageBox.Show(
                        checkMessage,
                        "Chưa đủ nguyên liệu",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );

                    AppendLog_SX("- Chưa thể lưu: " + checkMessage.Replace(Environment.NewLine, " | "));
                    return;
                }

                DialogResult confirm = MessageBox.Show(
                    "Đã quét đủ nguyên liệu cho mẻ trộn." + Environment.NewLine +
                    "Kế hoạch: " + _selectedKeHoachId_SX + Environment.NewLine +
                    "Mẻ trộn: " + _meTronDangThucHien_SX + Environment.NewLine +
                    "IdMeTron: " + _idMeTronHienTai_SX + Environment.NewLine + Environment.NewLine +
                    "Bạn có chắc muốn lưu lên Google Sheet không?",
                    "Xác nhận lưu trộn liệu",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );

                if (confirm != DialogResult.Yes)
                    return;

                btnLuuTronLieuSanXuat.Enabled = false;

                AppendLog_SX(
                    "- Đang lưu chiTietTronLieuSanXuat lên Google Sheet. IdMeTron: " +
                    _idMeTronHienTai_SX
                );

                int rows = await _apiService.SaveChiTietTronLieuSanXuatAsync(_dtTronLieuBatch_SX);

                AppendLog_SX("- Đã lưu chiTietTronLieuSanXuat: " + rows + " dòng.");

                MessageBox.Show(
                    "Lưu dữ liệu trộn liệu thành công." + Environment.NewLine +
                    "Số dòng: " + rows + Environment.NewLine +
                    "IdMeTron: " + _idMeTronHienTai_SX,
                    "Thành công",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                // Reload lại dữ liệu đã trộn từ Google Sheet để lần sau không bị reset mẻ
                AppendLog_SX("- Đang tải lại dữ liệu chiTietTronLieuSanXuat sau khi lưu...");
                _dtChiTietTronLieuSanXuatRecent_SX =
                    await _apiService.GetChiTietTronLieuSanXuatRecentDaysAsync(2);

                // Xóa bảng tạm 
                _dtTronLieuBatch_SX.Clear();
                dgvTronLieuBatch.DataSource = _dtTronLieuBatch_SX;
                AnCotTenNguyenLieuTrongTronLieuBatch();

                // Tính sang mẻ tiếp theo
                _meTronDangThucHien_SX = GetMeTronDangThucHien_SX(_selectedKeHoachId_SX);
                int soLuongKeHoach = GetSoLuongKeHoach_SX(_selectedKeHoachId_SX);

                if (soLuongKeHoach > 0 && _meTronDangThucHien_SX > soLuongKeHoach)
                {
                    _idMeTronHienTai_SX = "";

                    txtIdMeTron_SX.Clear();
                    txtMeTronDangThucHien_SX.Clear();

                    AppendLog_SX(
                        "- Kế hoạch " + _selectedKeHoachId_SX +
                        " đã hoàn thành đủ " + soLuongKeHoach + " mẻ."
                    );

                    MessageBox.Show(
                        "Kế hoạch này đã hoàn thành đủ " + soLuongKeHoach + " mẻ trộn.",
                        "Hoàn thành kế hoạch",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
                else
                {
                    _idMeTronHienTai_SX = GenerateIdMeTron_SX();

                    txtIdMeTron_SX.Text = _idMeTronHienTai_SX;
                    txtMeTronDangThucHien_SX.Text = _meTronDangThucHien_SX.ToString();

                    AppendLog_SX(
                        "- Chuyển sang mẻ trộn " + _meTronDangThucHien_SX +
                        "/" + soLuongKeHoach +
                        ". IdMeTron mới: " + _idMeTronHienTai_SX
                    );
                }

                HighlightNguyenLieuDaQuet_SX();

                txtScanBatch_SX.Clear();
                txtScanBatch_SX.Focus();
            }
            catch (Exception ex)
            {
                AppendLog_SX("- Lỗi lưu trộn liệu: " + ex.Message);

                MessageBox.Show(
                    "Lưu dữ liệu trộn liệu thất bại." +
                    Environment.NewLine + Environment.NewLine +
                    ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            finally
            {
                btnLuuTronLieuSanXuat.Enabled = true;
            }
        }

        private void CapNhatSaiSoTheoDongDangChon(string canVuaThayDoi)
        {
            try
            {
                if (dgvNguyenLieuCan.CurrentRow == null || dgvNguyenLieuCan.CurrentRow.IsNewRow)
                    return;

                string canSuDung = GetCellValue(dgvNguyenLieuCan.CurrentRow, "colCanSuDung");

                if (!string.Equals(canSuDung, canVuaThayDoi, StringComparison.OrdinalIgnoreCase))
                    return;

                HienThiSaiSoNguyenLieuCan(dgvNguyenLieuCan.CurrentRow);
            }
            catch
            {
            }
        }

        private void txtValCanBan_TextChanged(object sender, EventArgs e)
        {
            CapNhatSaiSoTheoDongDangChon("Cân bàn");
        }

        private void txtValCan6kg_TextChanged(object sender, EventArgs e)
        {
            CapNhatSaiSoTheoDongDangChon("Cân 6kg");
        }

        private void txtValCanPhanTich_TextChanged(object sender, EventArgs e)
        {
            CapNhatSaiSoTheoDongDangChon("Cân phân tích");
        }

        private void DangXuat()
        {
            DialogResult confirm = MessageBox.Show(
                "Bạn có chắc muốn đăng xuất tài khoản hiện tại không?",
                "Xác nhận đăng xuất",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (confirm != DialogResult.Yes)
                return;

            // Xóa session đăng nhập
            AppSession.CurrentUser = null;

            // Khóa khu vực điều khiển chính
            grbDieuKhienDL.Enabled = false;
            tabControl1.Enabled = false;

            // Xóa thông tin tài khoản
            txtInforTK.Clear();
            txtTenDangNhap.Clear();
            txtMatKhau.Clear();

            // Xóa dữ liệu đang chọn
            _selectedTenBaiLieu = "";
            _selectedKeHoachId = "";
            _selectedPhieuXuatId = "";
            _selectedNguyenLieuCanRow = null;

            // Xóa dữ liệu bảng sản xuất/cân nếu muốn
            dgvKeHoachSanXuat.DataSource = null;
            dgvNguyenLieuCan.DataSource = null;

            if (_dtChiTietCan != null)
                _dtChiTietCan.Clear();

            dataGridViewChiTietCan.DataSource = _dtChiTietCan;

            // Xóa QR/barcode batch
            txtNoiDungQRBatch.Clear();

            if (ptbQRshow.Image != null)
            {
                Image oldImg = ptbQRshow.Image;
                ptbQRshow.Image = null;
                oldImg.Dispose();
            }

            // Xóa các textbox phụ
            txtThongTinKeHoach.Clear();
            txtChiTietNguyenLieuCan.Clear();
            txtIdNLKhoShow.Clear();
            txtIdNLKhoQR.Clear();
            txtTenNLShow.Clear();

            // Nếu có label sai số
            lblSaiSo.Text = "";
            lblSaiSo.BackColor = SystemColors.Control;
            lblSaiSo.ForeColor = Color.Black;

            // Đưa con trỏ về ô tài khoản
            txtTenDangNhap.Focus();

            AppendLog("- Đã đăng xuất tài khoản.");
        }

        private void btnDangXuat_Click(object sender, EventArgs e)
        {
            DangXuat();
        } 

        private void timerDocCan_Tick(object sender, EventArgs e)
        {
            if(hasSuccessCan6k == true)
            {
                SetCanStatusImage(lblStatusCan6kg, true);
                portCan6kg.DiscardInBuffer();

                portCan6kg.Write("SI\r\n");
                System.Threading.Thread.Sleep(50);

                string data = portCan6kg.ReadExisting();
                //textBox1.Text = data;

                Match match = Regex.Match(data, @"[-+]?\d*\.?\d+");

                if (match.Success)
                {
                    txtValCan6kg.Text = match.Value; 
                }
            }

            if (hasSuccessCanPhanTich == true)
            {
                SetCanStatusImage(lblStatusCanPhanTich, true);
                portCanPhanTich.DiscardInBuffer();

                portCanPhanTich.Write("SI\r\n");
                System.Threading.Thread.Sleep(50);

                string data = portCanPhanTich.ReadExisting();
                //textBox1.Text = data;

                Match match = Regex.Match(data, @"[-+]?\d*\.?\d+");

                if (match.Success)
                {
                    txtValCanPhanTich.Text = match.Value;
                }
            }

            /*
            if (_serialCanBan != null && _serialCanBan.IsOpen)
            {
                decimal? valCanBan = DocCanBan300kg();

                if (valCanBan.HasValue)
                {
                    txtValCanBan.Text = valCanBan.Value.ToString("0.##", CultureInfo.InvariantCulture);
                    SetCanStatusImage(lblStatusCanBan, true);
                }
            }*/
        }

        private void dgvNguyenLieuCan_CellFormatting(object sender, DataGridViewCellFormattingEventArgs e)
        {
            if (e.RowIndex < 0) return;

            if (dgvNguyenLieuCan.Columns[e.ColumnIndex].Name != "colKhoiLuong")
            {
                return;
            }

            if (e.Value == null || e.Value == DBNull.Value)
            {
                return;
            }

            if (!decimal.TryParse(e.Value.ToString(), out decimal value))
            {
                return;
            }

            string canSuDung = "";

            if (dgvNguyenLieuCan.Columns.Contains("colCanSuDung"))
            {
                canSuDung = Convert.ToString(dgvNguyenLieuCan.Rows[e.RowIndex].Cells["colCanSuDung"].Value)?.Trim() ?? "";
            }
            else if (dgvNguyenLieuCan.Columns.Contains("canSuDung"))
            {
                canSuDung = Convert.ToString(dgvNguyenLieuCan.Rows[e.RowIndex].Cells["canSuDung"].Value)?.Trim() ?? "";
            }

            if (canSuDung.Equals("Cân bàn", StringComparison.OrdinalIgnoreCase))
            {
                e.Value = value.ToString("N2");
            }
            else if (
                canSuDung.Equals("Cân 6kg", StringComparison.OrdinalIgnoreCase) ||
                canSuDung.Equals("Cân phân tích", StringComparison.OrdinalIgnoreCase))
            {
                e.Value = value.ToString("N4");
            }
            else
            {
                e.Value = value.ToString("N4");
            }

            e.FormattingApplied = true;
        }

        private void AnCotTenNguyenLieuTrongTronLieuBatch()
        {
            if (dgvTronLieuBatch == null || dgvTronLieuBatch.Columns.Count == 0)
            {
                return;
            }

            string[] tenCotCanAn =
            {
                "tenNguyenLieu",
                "TenNguyenLieu",
                "colTenNguyenLieu",
                "colTenNguyenLieu_SX"
            };

            foreach (string tenCot in tenCotCanAn)
            {
                if (dgvTronLieuBatch.Columns.Contains(tenCot))
                {
                    dgvTronLieuBatch.Columns[tenCot].Visible = false;
                }
            }

            if (dgvTronLieuBatch.Columns.Contains("maNguyenLieu"))
            {
                dgvTronLieuBatch.Columns["maNguyenLieu"].HeaderText = "Mã nguyên liệu";
                dgvTronLieuBatch.Columns["maNguyenLieu"].Visible = true;
            }
        }

        private void AnCotTenNguyenLieuTrongChiTietCan()
        {
            if (dataGridViewChiTietCan == null || dataGridViewChiTietCan.Columns.Count == 0)
            {
                return;
            }

            string[] tenCotCanAn =
            {
                "tenNguyenLieu",
                "TenNguyenLieu",
                "colTenNguyenLieu",
                "colTenNguyenLieu_SX"
            };

            foreach (string tenCot in tenCotCanAn)
            {
                if (dataGridViewChiTietCan.Columns.Contains(tenCot))
                {
                    dataGridViewChiTietCan.Columns[tenCot].Visible = false;
                }
            }

            if (dataGridViewChiTietCan.Columns.Contains("maNguyenLieu"))
            {
                dataGridViewChiTietCan.Columns["maNguyenLieu"].HeaderText = "Mã nguyên liệu";
                dataGridViewChiTietCan.Columns["maNguyenLieu"].Visible = true;
            }
        }

        private bool KiemTraVaKhoaNeuKeHoachDaCanBatch(string phieuXuatId, string keHoachId, string tenBaiLieu)
        {
            try
            {
                bool daCanDayDu = _sqlDataService.IsKeHoachDaCanBatchDayDu(
                    phieuXuatId,
                    keHoachId,
                    tenBaiLieu
                );

                if (daCanDayDu)
                {
                    btnThemDLCan.Enabled = false;
                    btnXacNhanLuuCanNL.Enabled = false;

                    MessageBox.Show(
                        "Kế hoạch này đã hoàn thành cân đủ toàn bộ nguyên liệu." + Environment.NewLine +
                        "Mã kế hoạch: " + keHoachId + Environment.NewLine +
                        "Phiếu xuất: " + phieuXuatId + Environment.NewLine +
                        "Bài liệu: " + tenBaiLieu + Environment.NewLine + Environment.NewLine +
                        "Hệ thống đã khóa chức năng thêm dữ liệu cân và lưu cân để tránh cân/lưu trùng.",
                        "Đã hoàn thành cân batch",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );

                    AppendLog("- Kế hoạch " + keHoachId + " đã cân đủ toàn bộ nguyên liệu. Đã khóa nút cân/lưu.");

                    return true;
                }

                btnThemDLCan.Enabled = true;
                btnXacNhanLuuCanNL.Enabled = true;

                AppendLog("- Kế hoạch " + keHoachId + " chưa cân đủ toàn bộ nguyên liệu. Vẫn cho phép cân tiếp.");

                return false;
            }
            catch (Exception ex)
            {
                btnThemDLCan.Enabled = false;
                btnXacNhanLuuCanNL.Enabled = false;

                MessageBox.Show(
                    "Không kiểm tra được trạng thái cân batch của kế hoạch." +
                    Environment.NewLine + Environment.NewLine +
                    ex.Message,
                    "Lỗi kiểm tra ChiTietCanBatch",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                AppendLog("- Lỗi kiểm tra ChiTietCanBatch: " + ex.Message);

                return true;
            }
        }

        private void btnOpenFormSCADA_Click(object sender, EventArgs e)
        {
            if (_frmScadaMain == null || _frmScadaMain.IsDisposed)
            {
                _frmScadaMain = new FrmScadaMain();

                _frmScadaMain.FormClosed += (s, args) =>
                {
                    _frmScadaMain = null;
                };

                _frmScadaMain.Show();
            }
            else
            {
                if (!_frmScadaMain.Visible)
                {
                    _frmScadaMain.Show();
                }

                if (_frmScadaMain.WindowState == FormWindowState.Minimized)
                {
                    _frmScadaMain.WindowState = FormWindowState.Normal;
                }

                _frmScadaMain.Activate();
                _frmScadaMain.BringToFront();
            }
        }

        private void txtNoiDungQRVi_TextChanged(object sender, EventArgs e)
        {
            try
            {
                string maQRVi = txtNoiDungQRVi.Text;
                 
                if (ptbQRVi.Image != null)
                {
                    ptbQRVi.Image.Dispose();
                    ptbQRVi.Image = null;
                }

                Bitmap qrImage = TaoAnhQrCode(maQRVi);

                ptbQRVi.SizeMode = PictureBoxSizeMode.Zoom;
                ptbQRVi.Image = qrImage;
                 
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Không tạo được mã QR bán thành phẩm." + Environment.NewLine + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                 
            }

            try
            {
                string maQuet = (txtNoiDungQRVi.Text ?? "").Trim();

                // Máy quét có thể gửi kèm xuống dòng, tab.
                maQuet = maQuet.Replace("\r", "").Replace("\n", "").Replace("\t", "").Trim();

                if (string.IsNullOrWhiteSpace(maQuet))
                    return;

                string maThanhPhamDangChon = GetMaThanhPhamDangChonLapVi();

                if (string.IsNullOrWhiteSpace(maThanhPhamDangChon))
                    return;

                // Chưa trùng thì không làm gì, vì TextChanged sẽ chạy từng ký tự khi máy quét đang nhập.
                if (!string.Equals(maQuet, maThanhPhamDangChon, StringComparison.OrdinalIgnoreCase))
                    return;

                string noiDungInDate = TaoNoiDungInDateChoVi(maThanhPhamDangChon);

                txtNoiDungInDate.Text = noiDungInDate;

                GhiLogEpVi("Quét đúng mã vỉ: " + maQuet);
                GhiLogEpVi("Đã tạo nội dung in date: " + noiDungInDate.Replace(Environment.NewLine, " | "));
            }
            catch (Exception ex)
            {
                GhiLogEpViLoi("Lỗi xử lý QR vỉ: " + ex.Message);

                MessageBox.Show(
                    "Lỗi xử lý QR vỉ:\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }

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

        private void btnInQRVi_Click(object sender, EventArgs e)
        {
             
        }

        private int GetSoNgayLapVi()
        {
            string text = "";

            if (cbbSoNgay.SelectedItem != null)
                text = cbbSoNgay.SelectedItem.ToString();
            else
                text = cbbSoNgay.Text;

            text = (text ?? "").Trim();

            int soNgay;
            if (!int.TryParse(text, out soNgay))
                soNgay = 0;

            if (soNgay < 0)
                soNgay = 0;

            return soNgay;
        }

        private void FormatDataGridViewLapVi()
        {
            if (dataGridViewLapVi == null)
                return;

            dataGridViewLapVi.AutoGenerateColumns = true;
            dataGridViewLapVi.AllowUserToAddRows = false;
            dataGridViewLapVi.AllowUserToDeleteRows = false;
            dataGridViewLapVi.ReadOnly = true;
            dataGridViewLapVi.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewLapVi.MultiSelect = false;
            dataGridViewLapVi.RowHeadersVisible = false;
            dataGridViewLapVi.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells;

            if (dataGridViewLapVi.Columns.Contains("maThanPham"))
            {
                dataGridViewLapVi.Columns["maThanPham"].HeaderText = "Mã thành phẩm";
                dataGridViewLapVi.Columns["maThanPham"].DisplayIndex = 0;
                dataGridViewLapVi.Columns["maThanPham"].Width = 210;
                dataGridViewLapVi.Columns["maThanPham"].DefaultCellStyle.Font =
                    new Font(dataGridViewLapVi.Font, FontStyle.Bold);
            }

            if (dataGridViewLapVi.Columns.Contains("soLuongVi"))
            {
                dataGridViewLapVi.Columns["soLuongVi"].HeaderText = "Số lượng vỉ";
                dataGridViewLapVi.Columns["soLuongVi"].DisplayIndex = 1;
                dataGridViewLapVi.Columns["soLuongVi"].Width = 110;
            }

            if (dataGridViewLapVi.Columns.Contains("thoiGianTao"))
            {
                dataGridViewLapVi.Columns["thoiGianTao"].HeaderText = "Thời gian tạo";
                dataGridViewLapVi.Columns["thoiGianTao"].DisplayIndex = 2;
                dataGridViewLapVi.Columns["thoiGianTao"].Width = 170;
            }

            if (dataGridViewLapVi.Columns.Contains("nguoiTao"))
                dataGridViewLapVi.Columns["nguoiTao"].HeaderText = "Người tạo";

            if (dataGridViewLapVi.Columns.Contains("maBanThanhPham1"))
                dataGridViewLapVi.Columns["maBanThanhPham1"].HeaderText = "BTP 1";

            if (dataGridViewLapVi.Columns.Contains("maBanThanhPham2"))
                dataGridViewLapVi.Columns["maBanThanhPham2"].HeaderText = "BTP 2";

            if (dataGridViewLapVi.Columns.Contains("maBanThanhPham3"))
                dataGridViewLapVi.Columns["maBanThanhPham3"].HeaderText = "BTP 3";

            if (dataGridViewLapVi.Columns.Contains("maBanThanhPham4"))
                dataGridViewLapVi.Columns["maBanThanhPham4"].HeaderText = "BTP 4";

            if (dataGridViewLapVi.Columns.Contains("soLuongBanThanhPham1"))
                dataGridViewLapVi.Columns["soLuongBanThanhPham1"].HeaderText = "SL BTP 1";

            if (dataGridViewLapVi.Columns.Contains("soLuongBanThanhPham2"))
                dataGridViewLapVi.Columns["soLuongBanThanhPham2"].HeaderText = "SL BTP 2";

            if (dataGridViewLapVi.Columns.Contains("soLuongBanThanhPham3"))
                dataGridViewLapVi.Columns["soLuongBanThanhPham3"].HeaderText = "SL BTP 3";

            if (dataGridViewLapVi.Columns.Contains("soLuongBanThanhPham4"))
                dataGridViewLapVi.Columns["soLuongBanThanhPham4"].HeaderText = "SL BTP 4";
        }

        private async void btnTaiDLLapVi_Click(object sender, EventArgs e)
        {
            try
            {
                btnTaiDLLapVi.Enabled = false;
                Cursor = Cursors.WaitCursor;

                DateTime ngayChon = dtpNgayLapVi.Value.Date;
                int soNgayTruoc = GetSoNgayLapVi();

                DateTime tuNgay = ngayChon.AddDays(-soNgayTruoc);
                DateTime denNgay = ngayChon;

                GhiLogEpVi("Bắt đầu tải dữ liệu lắp vỉ.");
                GhiLogEpVi("Khoảng ngày lắp vỉ: " + tuNgay.ToString("dd/MM/yyyy") + " đến " + denNgay.ToString("dd/MM/yyyy"));

                GhiLogEpVi("Đang gọi API chiTietLapVi...");

                ApiLapViResponse lapViRes = await _googleSheetApiService
                    .GetChiTietLapViByDateRangeAsync(ngayChon, soNgayTruoc);

                _listChiTietLapVi = lapViRes.data ?? new List<Dictionary<string, object>>();

                GhiLogEpVi("Đã tải chiTietLapVi: " + _listChiTietLapVi.Count + " dòng.");

                GhiLogEpVi("Đang chuyển dữ liệu lắp vỉ sang DataTable...");

                _dtChiTietLapVi = _googleSheetApiService.ConvertLapViToDataTable(lapViRes);

                dataGridViewLapVi.DataSource = null;
                dataGridViewLapVi.DataSource = _dtChiTietLapVi;

                FormatDataGridViewLapVi();

                GhiLogEpVi("Đã hiển thị dữ liệu lắp vỉ lên bảng.");

                GhiLogEpVi("Đang tải ChiTietSanXuatBanThanhPham 1 tháng gần nhất...");

                await TaiChiTietSanXuatBanThanhPhamRecentMonthAsync();

                GhiLogEpVi("Đã tải ChiTietSanXuatBanThanhPham: " + _listChiTietSanXuatBanThanhPham.Count + " dòng.");

                GhiLogEpVi("Hoàn thành tải dữ liệu lắp vỉ và bán thành phẩm.");

                MessageBox.Show(
                    "Đã tải dữ liệu thành công.\n\n" +
                    "Lắp vỉ từ ngày: " + tuNgay.ToString("dd/MM/yyyy") + "\n" +
                    "Lắp vỉ đến ngày: " + denNgay.ToString("dd/MM/yyyy") + "\n\n" +
                    "Số dòng lắp vỉ: " + _listChiTietLapVi.Count + "\n" +
                    "Số dòng bán thành phẩm 1 tháng gần nhất: " + _listChiTietSanXuatBanThanhPham.Count,
                    "Thông báo",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                GhiLogEpViLoi("Tải dữ liệu thất bại. " + ex.Message);

                MessageBox.Show(
                    "Lỗi tải dữ liệu:\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            finally
            {
                Cursor = Cursors.Default;
                btnTaiDLLapVi.Enabled = true;
            }
        }

        private Dictionary<string, object> GetSelectedLapViRow()
        {
            if (dataGridViewLapVi.CurrentRow == null)
                return null;

            int rowIndex = dataGridViewLapVi.CurrentRow.Index;

            if (rowIndex < 0 || rowIndex >= _listChiTietLapVi.Count)
                return null;

            return _listChiTietLapVi[rowIndex];
        }

        private string GetSelectedMaThanhPhamLapVi()
        {
            Dictionary<string, object> row = GetSelectedLapViRow();

            if (row == null)
                return "";

            object value;

            if (row.TryGetValue("maThanPham", out value) && value != null)
                return value.ToString();

            return "";
        } 

        private async Task TaiChiTietSanXuatBanThanhPhamRecentMonthAsync()
        {
            ApiBanThanhPhamResponse res =
                await _googleSheetApiService.GetChiTietSanXuatBanThanhPhamRecentMonthAsync();

            _listChiTietSanXuatBanThanhPham =
                res.data ?? new List<Dictionary<string, object>>();

            _dtChiTietSanXuatBanThanhPham =
                _googleSheetApiService.ConvertDictionaryListToDataTable(
                    res.data,
                    res.headers,
                    new List<string>
                    {
                "IdBanThanhPham",
                "tenBaiLieu",
                "soLuongVien",
                "thoiGianHoanThanh",
                "IdMeTron"
                    }
                );
        }

        private List<Dictionary<string, object>> FindBanThanhPhamRowsById(string idBanThanhPham)
        {
            idBanThanhPham = (idBanThanhPham ?? "").Trim();

            if (string.IsNullOrWhiteSpace(idBanThanhPham))
                return new List<Dictionary<string, object>>();

            return _listChiTietSanXuatBanThanhPham
                .Where(row =>
                {
                    object value;

                    if (!row.TryGetValue("IdBanThanhPham", out value) || value == null)
                        return false;

                    return string.Equals(
                        value.ToString().Trim(),
                        idBanThanhPham,
                        StringComparison.OrdinalIgnoreCase
                    );
                })
                .ToList();
        }

        private string GetGridCellValue(DataGridViewRow row, string columnName)
        {
            if (row == null || string.IsNullOrWhiteSpace(columnName))
                return "";

            if (!dataGridViewLapVi.Columns.Contains(columnName))
                return "";

            object value = row.Cells[columnName].Value;

            if (value == null)
                return "";

            return value.ToString().Trim();
        }

        private Dictionary<string, object> FindFirstBanThanhPhamById(string idBanThanhPham)
        {
            idBanThanhPham = (idBanThanhPham ?? "").Trim();

            if (string.IsNullOrWhiteSpace(idBanThanhPham))
                return null;

            if (_listChiTietSanXuatBanThanhPham == null)
                return null;

            return _listChiTietSanXuatBanThanhPham
                .FirstOrDefault(row =>
                {
                    object value;

                    if (!row.TryGetValue("IdBanThanhPham", out value) || value == null)
                        return false;

                    return string.Equals(
                        value.ToString().Trim(),
                        idBanThanhPham,
                        StringComparison.OrdinalIgnoreCase
                    );
                });
        }

        private string GetDictValue(Dictionary<string, object> row, string key)
        {
            if (row == null || string.IsNullOrWhiteSpace(key))
                return "";

            object value;

            if (!row.TryGetValue(key, out value) || value == null)
                return "";

            return value.ToString().Trim();
        }

        private string BuildBtpLine(int index, string maBanThanhPham, string soLuongVienTrenVi)
        {
            maBanThanhPham = (maBanThanhPham ?? "").Trim();
            soLuongVienTrenVi = (soLuongVienTrenVi ?? "").Trim();

            if (string.IsNullOrWhiteSpace(maBanThanhPham))
                return "";

            Dictionary<string, object> btp = FindFirstBanThanhPhamById(maBanThanhPham);

            string tenBaiLieu = GetDictValue(btp, "tenBaiLieu");
            string thoiGianXacNhanTron = GetDictValue(btp, "thoiGianXacNhanTron");

            if (string.IsNullOrWhiteSpace(tenBaiLieu))
                tenBaiLieu = "Không tìm thấy tên bài liệu";

            string thoiGianXacNhanTronText = GetDateTimeTextVN(thoiGianXacNhanTron);

            if (string.IsNullOrWhiteSpace(thoiGianXacNhanTronText))
                thoiGianXacNhanTronText = "Không có thời gian xác nhận trộn";

            return "BTP " + index + ": " +
                maBanThanhPham +
                " - " + tenBaiLieu +
                " - NSX: " + thoiGianXacNhanTronText +
                " - " + soLuongVienTrenVi + " viên/vỉ\r\n";
        }

        private void ClearNgaySanXuatBtpTextBox()
        {
            if (txtNSXBTP1 != null) txtNSXBTP1.Text = "";
            if (txtNSXBTP2 != null) txtNSXBTP2.Text = "";
            if (txtNSXBTP3 != null) txtNSXBTP3.Text = "";
            if (txtNSXBTP4 != null) txtNSXBTP4.Text = "";
        }

        private void dataGridViewLapVi_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            try
            {
                if (e.RowIndex < 0)
                {
                    ClearNgaySanXuatBtpTextBox();
                    return;
                }

                if (dataGridViewLapVi.Rows.Count == 0)
                {
                    ClearNgaySanXuatBtpTextBox();
                    return;
                }

                DataGridViewRow row = dataGridViewLapVi.Rows[e.RowIndex];

                string maThanPham = GetGridCellValue(row, "maThanPham");
                string soLuongVi = GetGridCellValue(row, "soLuongVi");
                string thoiGianTao = GetGridCellValue(row, "thoiGianTao");

                string maBtp1 = GetGridCellValue(row, "maBanThanhPham1");
                string maBtp2 = GetGridCellValue(row, "maBanThanhPham2");
                string maBtp3 = GetGridCellValue(row, "maBanThanhPham3");
                string maBtp4 = GetGridCellValue(row, "maBanThanhPham4");

                string slBtp1 = GetGridCellValue(row, "soLuongBanThanhPham1");
                string slBtp2 = GetGridCellValue(row, "soLuongBanThanhPham2");
                string slBtp3 = GetGridCellValue(row, "soLuongBanThanhPham3");
                string slBtp4 = GetGridCellValue(row, "soLuongBanThanhPham4");

                SetNgaySanXuatBtpTextBox(1, maBtp1);
                SetNgaySanXuatBtpTextBox(2, maBtp2);
                SetNgaySanXuatBtpTextBox(3, maBtp3);
                SetNgaySanXuatBtpTextBox(4, maBtp4);

                if (string.IsNullOrWhiteSpace(maThanPham))
                {
                    ClearNgaySanXuatBtpTextBox();
                    txtChiTietLapVi.Text = "Không đọc được mã thành phẩm từ dòng đang chọn.";
                    return;
                }

                StringBuilder sb = new StringBuilder();

                GhiLogEpVi("Đã chọn mã thành phẩm: " + maThanPham);
                sb.AppendLine("Mã thành phẩm: " + maThanPham + " - " + soLuongVi + " - " + thoiGianTao + "\r\n");

                string line1 = BuildBtpLine(1, maBtp1, slBtp1);
                string line2 = BuildBtpLine(2, maBtp2, slBtp2);
                string line3 = BuildBtpLine(3, maBtp3, slBtp3);
                string line4 = BuildBtpLine(4, maBtp4, slBtp4);

                if (!string.IsNullOrWhiteSpace(line1))
                    sb.AppendLine(line1);

                if (!string.IsNullOrWhiteSpace(line2))
                    sb.AppendLine(line2);

                if (!string.IsNullOrWhiteSpace(line3))
                    sb.AppendLine(line3);

                if (!string.IsNullOrWhiteSpace(line4))
                    sb.AppendLine(line4);

                txtChiTietLapVi.Text = sb.ToString();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Lỗi hiển thị chi tiết lắp vỉ:\n" + ex.Message,
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private string GetDateTimeTextVN(string dateTimeText)
        {
            dateTimeText = (dateTimeText ?? "").Trim();

            if (string.IsNullOrWhiteSpace(dateTimeText))
                return "";

            DateTime dt;

            if (DateTime.TryParse(dateTimeText, out dt))
                return dt.ToString("dd/MM/yyyy HH:mm:ss");

            // Trường hợp text đang là yyyy-MM-dd HH:mm:ss
            if (dateTimeText.Length >= 19)
            {
                string datePart = dateTimeText.Substring(0, 10); // yyyy-MM-dd
                string timePart = dateTimeText.Substring(11, 8); // HH:mm:ss

                string[] parts = datePart.Split('-');

                if (parts.Length == 3)
                    return parts[2] + "/" + parts[1] + "/" + parts[0] + " " + timePart;
            }

            // Trường hợp chỉ có yyyy-MM-dd
            if (dateTimeText.Length >= 10)
            {
                string datePart = dateTimeText.Substring(0, 10);
                string[] parts = datePart.Split('-');

                if (parts.Length == 3)
                    return parts[2] + "/" + parts[1] + "/" + parts[0];
            }

            return dateTimeText;
        }

        private void SetNgaySanXuatBtpTextBox(int index, string maBanThanhPham)
        {
            maBanThanhPham = (maBanThanhPham ?? "").Trim();

            string thoiGianXacNhanTronText = "";

            if (!string.IsNullOrWhiteSpace(maBanThanhPham))
            {
                Dictionary<string, object> btp = FindFirstBanThanhPhamById(maBanThanhPham);

                string thoiGianXacNhanTron = GetDictValue(btp, "thoiGianXacNhanTron");

                thoiGianXacNhanTronText = GetDateTimeTextVN(thoiGianXacNhanTron);
            }

            if (index == 1 && txtNSXBTP1 != null)
                txtNSXBTP1.Text = thoiGianXacNhanTronText;

            if (index == 2 && txtNSXBTP2 != null)
                txtNSXBTP2.Text = thoiGianXacNhanTronText;

            if (index == 3 && txtNSXBTP3 != null)
                txtNSXBTP3.Text = thoiGianXacNhanTronText;

            if (index == 4 && txtNSXBTP4 != null)
                txtNSXBTP4.Text = thoiGianXacNhanTronText;
        }

        private void GhiLogEpVi(string noiDung)
        {
            try
            {
                if (txtLogEpVi == null)
                    return;

                if (txtLogEpVi.InvokeRequired)
                {
                    txtLogEpVi.Invoke(new Action<string>(GhiLogEpVi), noiDung);
                    return;
                }

                string timeText = DateTime.Now.ToString("HH:mm:ss");
                string line = "[" + timeText + "] " + (noiDung ?? "");

                if (string.IsNullOrWhiteSpace(txtLogEpVi.Text))
                    txtLogEpVi.Text = line;
                else
                    txtLogEpVi.AppendText(Environment.NewLine + line);

                txtLogEpVi.SelectionStart = txtLogEpVi.Text.Length;
                txtLogEpVi.ScrollToCaret();
            }
            catch
            {
                // Không để lỗi ghi log làm dừng chương trình.
            }
        }

        private void GhiLogEpViLoi(string noiDung)
        {
            GhiLogEpVi("LỖI: " + noiDung);
        }

        private void XoaLogEpVi()
        {
            try
            {
                if (txtLogEpVi == null)
                    return;

                if (txtLogEpVi.InvokeRequired)
                {
                    txtLogEpVi.Invoke(new Action(XoaLogEpVi));
                    return;
                }

                txtLogEpVi.Clear();
            }
            catch
            {
            }
        }

        private string GetMaThanhPhamDangChonLapVi()
        {
            if (dataGridViewLapVi == null)
                return "";

            if (dataGridViewLapVi.CurrentRow == null)
                return "";

            DataGridViewRow row = dataGridViewLapVi.CurrentRow;

            if (!dataGridViewLapVi.Columns.Contains("maThanPham"))
                return "";

            object value = row.Cells["maThanPham"].Value;

            if (value == null)
                return "";

            return value.ToString().Trim();
        }
        private bool TryParseNgayGioVN(string text, out DateTime result)
        {
            result = DateTime.MinValue;

            text = (text ?? "").Trim();

            if (string.IsNullOrWhiteSpace(text))
                return false;

            string[] formats =
            {
                "dd/MM/yyyy HH:mm:ss",
                "dd/MM/yyyy H:mm:ss",
                "dd/MM/yyyy HH:mm",
                "dd/MM/yyyy H:mm",
                "dd/MM/yyyy",

                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd H:mm:ss",
                "yyyy-MM-dd HH:mm",
                "yyyy-MM-dd H:mm",
                "yyyy-MM-dd"
            };

            if (DateTime.TryParseExact(
                text,
                formats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out result))
            {
                return true;
            }

            return DateTime.TryParse(text, out result);
        }

        private bool TryGetNgaySanXuatSomNhat(out DateTime ngaySanXuat)
        {
            ngaySanXuat = DateTime.MinValue;

            List<DateTime> dates = new List<DateTime>();

            DateTime d;

            if (txtNSXBTP1 != null && TryParseNgayGioVN(txtNSXBTP1.Text, out d))
                dates.Add(d);

            if (txtNSXBTP2 != null && TryParseNgayGioVN(txtNSXBTP2.Text, out d))
                dates.Add(d);

            if (txtNSXBTP3 != null && TryParseNgayGioVN(txtNSXBTP3.Text, out d))
                dates.Add(d);

            if (txtNSXBTP4 != null && TryParseNgayGioVN(txtNSXBTP4.Text, out d))
                dates.Add(d);

            if (dates.Count == 0)
                return false;

            ngaySanXuat = dates.Min().Date;
            return true;
        }

        private bool TryParseNgayGioTuMaThanhPham(string maThanPham, out DateTime ngayGioThanhPham)
        {
            ngayGioThanhPham = DateTime.MinValue;

            maThanPham = (maThanPham ?? "").Trim();

            if (string.IsNullOrWhiteSpace(maThanPham))
                return false;

            // Lấy toàn bộ chữ số trong mã.
            // TP20260613082035690 -> 20260613082035690
            string digits = Regex.Replace(maThanPham, @"\D", "");

            // Cần tối thiểu yyyyMMddHHmm = 12 số
            if (digits.Length < 12)
                return false;

            string part = digits.Substring(0, 12); // yyyyMMddHHmm

            return DateTime.TryParseExact(
                part,
                "yyyyMMddHHmm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out ngayGioThanhPham
            );
        }

        private string TaoMaThanhPhamRutGonTheoNsx(string maThanPham, DateTime ngaySanXuat)
        {
            DateTime ngayGioThanhPham;

            if (!TryParseNgayGioTuMaThanhPham(maThanPham, out ngayGioThanhPham))
                return "";

            int soNgayTuNsxDenMaTp = (int)(ngayGioThanhPham.Date - ngaySanXuat.Date).TotalDays;

            if (soNgayTuNsxDenMaTp < 0)
                soNgayTuNsxDenMaTp = 0;

            string ngayText = soNgayTuNsxDenMaTp.ToString("00");
            string gioPhutText = ngayGioThanhPham.ToString("HHmm");

            return ngayText + gioPhutText;
        }

        private string TaoNoiDungInDateChoVi(string maThanPham)
        {
            DateTime ngaySanXuat;

            if (!TryGetNgaySanXuatSomNhat(out ngaySanXuat))
                throw new Exception("Chưa có ngày NSX BTP. Vui lòng chọn dòng lắp vỉ trước.");

            string n1 = ngaySanXuat.ToString("ddMMyy");

            int soNgayTuNsxDenHomNay = (int)(DateTime.Today - ngaySanXuat.Date).TotalDays;

            if (soNgayTuNsxDenHomNay < 0)
                soNgayTuNsxDenHomNay = 0;

            string s = soNgayTuNsxDenHomNay.ToString("00");

            string m = TaoMaThanhPhamRutGonTheoNsx(maThanPham, ngaySanXuat);

            if (string.IsNullOrWhiteSpace(m))
                throw new Exception("Không rút gọn được mã thành phẩm: " + maThanPham);

            return "NSX " + n1 + " DM" +
                   Environment.NewLine +
                   s + " " + m;
        }


    }
}
