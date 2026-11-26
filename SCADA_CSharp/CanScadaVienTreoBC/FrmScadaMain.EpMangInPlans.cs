using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using CanScadaVienTreoBC.Models;

namespace CanScadaVienTreoBC
{
    public partial class FrmScadaMain
    {
        private bool _changingEpPlanFilter;
        private int _epPlanRequest;

        private void InitializeEpMangInPlans()
        {
            ckHomQuaVaHomNay.Checked = true;
            ck5NgayGanNhat.Checked = false;
            ckHomQuaVaHomNay.CheckedChanged += EpPlanFilter_CheckedChanged;
            ck5NgayGanNhat.CheckedChanged += EpPlanFilter_CheckedChanged;
            btnTaiKHEpMangIn.Click += btnTaiKHEpMangIn_Click;
            cbbKHEpMangIn.DropDownStyle = ComboBoxStyle.DropDownList;
            cbbKHEpMangIn.DisplayMember = "DisplayText";
            cbbKHEpMangIn.SelectedIndexChanged += cbbKHEpMangIn_SelectedIndexChanged;
            txtIdThungViVTBC.TextChanged += (sender, args) => ClearEpPlanPrintContent();
            RenderEpPlanBoxes(null);
        }

        private void ClearEpPlanPrintContent()
        {
            txtLotNoNSXCuNhat.Clear();
            txtNoiDungDongTrenInVi.Clear();
            txtNoiDungDongDuoiInVi.Clear();
        }

        private void EpPlanFilter_CheckedChanged(object sender, EventArgs e)
        {
            if (_changingEpPlanFilter) return;
            _changingEpPlanFilter = true;
            try
            {
                if (sender == ck5NgayGanNhat && ck5NgayGanNhat.Checked) ckHomQuaVaHomNay.Checked = false;
                else if (sender == ckHomQuaVaHomNay && ckHomQuaVaHomNay.Checked) ck5NgayGanNhat.Checked = false;
                if (!ckHomQuaVaHomNay.Checked && !ck5NgayGanNhat.Checked) ckHomQuaVaHomNay.Checked = true;
            }
            finally { _changingEpPlanFilter = false; }
            ++_epPlanRequest; // Discard a response fetched for an old date filter.
            cbbKHEpMangIn.DataSource = null;
            RenderEpPlanBoxes(null);
            ClearEpPlanPrintContent();
            btnTaiKHEpMangIn.Enabled = true;
            btnTaiKHEpMangIn.Text = "Tải kế hoạch ép màng in";
        }

        private async void btnTaiKHEpMangIn_Click(object sender, EventArgs e)
        {
            int request = ++_epPlanRequest;
            int days = ck5NgayGanNhat.Checked ? 5 : 2;
            btnTaiKHEpMangIn.Enabled = false;
            btnTaiKHEpMangIn.Text = "Đang tải...";
            cbbKHEpMangIn.DataSource = null;
            RenderEpPlanBoxes(null);
            ClearEpPlanPrintContent();
            try
            {
                var data = await _googleSheetApiService.GetScadaEpMangInPlansAsync(days);
                if (IsDisposed || request != _epPlanRequest) return;
                var plans = data.Plans ?? new List<KeHoachEpMangInModel>();
                var trace = data.Trace ?? new CongDoanEpMangInData();
                _dsKeHoachLapVi = trace.KeHoachLapVi ?? new List<KeHoachLapViVTBCModel>();
                _dsKetQuaLapVi = trace.KetQuaLapVi ?? new List<KetQuaLapViModel>();
                _dsChiTietBTPTheoThung = trace.ChiTietBTPTheoThung ?? new List<ChiTietBTPTheoThungModel>();
                HienThiDuLieuCongDoanEpMangIn();
                cbbKHEpMangIn.DataSource = plans;
                AppendLogScada("Đã tải " + plans.Count + " kế hoạch ép màng in theo ngày tạo, " + days + " ngày gần nhất.");
                if (plans.Count == 0) MessageBox.Show("Không có kế hoạch ép màng in trong khoảng ngày đã chọn.");
            }
            catch (Exception ex)
            {
                if (!IsDisposed && request == _epPlanRequest)
                    MessageBox.Show("Không tải được kế hoạch ép màng in: " + ex.Message);
            }
            finally
            {
                if (!IsDisposed && request == _epPlanRequest)
                {
                    btnTaiKHEpMangIn.Enabled = true;
                    btnTaiKHEpMangIn.Text = "Tải KH ép màng in";
                }
            }
        }

        private void cbbKHEpMangIn_SelectedIndexChanged(object sender, EventArgs e)
        {
            var plan = cbbKHEpMangIn.SelectedItem as KeHoachEpMangInModel;
            RenderEpPlanBoxes(plan == null ? null : plan.Items);
            txtIdThungViVTBC.Clear();
            ClearEpPlanPrintContent();
        }

        private void RenderEpPlanBoxes(List<ThungEpMangInModel> boxes)
        {
            var grid = dataGridViewIDThungEpMangIn;
            grid.AutoGenerateColumns = false;
            grid.Columns.Clear();
            grid.AllowUserToAddRows = false;
            grid.ReadOnly = true;
            grid.RowHeadersVisible = false;
            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells;
            grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "IdThungDungVi", DataPropertyName = "IdThungDungVi", HeaderText = "ID thùng" });
            grid.Columns.Add(new DataGridViewTextBoxColumn { DataPropertyName = "TrangThaiXuat", HeaderText = "Trạng thái xuất" });
            grid.Columns.Add(new DataGridViewTextBoxColumn { DataPropertyName = "SoLuongViDaXuat", HeaderText = "Số vỉ đã xuất" });
            grid.Columns.Add(new DataGridViewTextBoxColumn { DataPropertyName = "ThoiGianXuat", HeaderText = "Thời gian xuất" });
            grid.DataSource = boxes ?? new List<ThungEpMangInModel>();
            foreach (DataGridViewRow row in grid.Rows)
            {
                var box = row.DataBoundItem as ThungEpMangInModel;
                row.DefaultCellStyle.BackColor = box != null && box.DaXuat ? Color.LightGreen : Color.LightYellow;
            }
            grid.ClearSelection();
        }

        private bool ValidateEpPlanBox(bool notify)
        {
            string error = EpMangInPlanRules.Validate(cbbKHEpMangIn.SelectedItem as KeHoachEpMangInModel, txtIdThungViVTBC.Text);
            if (string.IsNullOrEmpty(error)) return true;
            txtNoiDungDongTrenInVi.Clear();
            txtNoiDungDongDuoiInVi.Clear();
            if (notify) MessageBox.Show(error, "Kiểm tra thùng ép màng in", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return false;
        }

    }
}
