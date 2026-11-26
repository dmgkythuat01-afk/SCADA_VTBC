using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using System.Net.Http;
using Newtonsoft.Json;
using CanScadaVienTreoBC.Models;
using Newtonsoft.Json.Linq;
using System.Data;
using System.Linq;

namespace CanScadaVienTreoBC.Services
{
    public class GoogleSheetApiService
    {
        // Apps Script dùng để đọc dữ liệu: getAccounts, getAllData
        private readonly string _readBaseUrl = "https://script.google.com/macros/s/AKfycbwWs2RmeSeyyQEhZ-HMX97ANW8GvmUy8XM9PRBpblwQAkWtn8W_PDMNbzs6kK_ojWoDLg/exec";

        // Apps Script dùng để ghi dữ liệu: saveChiTietCanBatch
        private readonly string _writeBaseUrl = "https://script.google.com/macros/s/AKfycbyKes-S20KGXhnD1Ov_GMUihpgQCB9DKTQf4hnmBGRleQcvgQnGj2ofEDc58kHSEMIg/exec";

        // Token của Apps Script đọc dữ liệu
        private readonly string _readToken = "CONFIGURE_READ_TOKEN";

        // Token của Apps Script ghi dữ liệu
        private readonly string _writeToken = "CONFIGURE_WRITE_TOKEN";

        public async Task<ScadaEpMangInPlansData> GetScadaEpMangInPlansAsync(int days)
        {
            if (days != 2 && days != 5) throw new ArgumentOutOfRangeException("days");
            // Plan/issue state lives in the existing stock write API, not the legacy read API.
            string url = BuildWriteUrl("getScadaEpMangInPlans") + "&days=" + days;
            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(90);
                string json = await client.GetStringAsync(url);
                if ((json ?? "").TrimStart().StartsWith("<"))
                    throw new Exception("API trả về HTML. Kiểm tra deployment Apps Script ghi dữ liệu.");
                var response = JObject.Parse(json);
                if (response["success"] == null || !response["success"].Value<bool>())
                    throw new Exception(Convert.ToString(response["message"]) + " (Cần cập nhật Apps Script hỗ trợ getScadaEpMangInPlans.)");
                if (!(response["plans"] is JArray)) throw new Exception("API thiếu danh sách kế hoạch ép màng in.");
                if (!(response["trace"] is JObject)) throw new Exception("API thiếu dữ liệu truy xuất của các thùng kế hoạch.");
                return response.ToObject<ScadaEpMangInPlansData>();
            }
        }

        public async Task<List<AccountModel>> GetAccountsAsync()
        {
            string url = BuildReadUrl("getAccounts");

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(30);

                string json = await client.GetStringAsync(url);

                ApiResponse<List<AccountModel>> response =
                    JsonConvert.DeserializeObject<ApiResponse<List<AccountModel>>>(json);

                if (response == null)
                    throw new Exception("Không đọc được dữ liệu trả về từ API.");

                if (!response.success)
                    throw new Exception(response.message ?? "API trả về lỗi.");

                return response.data ?? new List<AccountModel>();
            }
        }

        public async Task<JObject> GetAllDataAsync()
        {
            string url = BuildReadUrl("getAllData");

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                string json = await client.GetStringAsync(url);

                JObject root = JObject.Parse(json);

                bool success = root["success"] != null && root["success"].Value<bool>();

                if (!success)
                {
                    string message = root["message"] == null
                        ? "API trả về lỗi."
                        : root["message"].ToString();

                    throw new Exception(message);
                }

                JObject data = root["data"] as JObject;

                if (data == null)
                {
                    throw new Exception("API không trả về data.");
                }

                return data;
            }
        }

        public async Task<int> SaveChiTietCanBatchAsync(DataTable dt)
        {
            if (dt == null || dt.Rows.Count == 0)
                throw new Exception("Không có dữ liệu ChiTietCanBatch để lưu Google Sheet.");

            string url = BuildWriteUrl("saveChiTietCanBatch");

            JArray rows = new JArray();

            foreach (DataRow dr in dt.Rows)
            {
                JObject obj = new JObject();

                foreach (DataColumn col in dt.Columns)
                {
                    object value = dr[col.ColumnName];

                    obj[col.ColumnName] = value == null || value == DBNull.Value
                        ? ""
                        : Convert.ToString(value);
                }

                rows.Add(obj);
            }

            JObject body = new JObject();
            body["rows"] = rows;

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                using (StringContent content = new StringContent(
                    body.ToString(),
                    Encoding.UTF8,
                    "application/json"))
                {
                    HttpResponseMessage httpResponse = await client.PostAsync(url, content);
                    string json = await httpResponse.Content.ReadAsStringAsync();

                    if (!httpResponse.IsSuccessStatusCode)
                    {
                        throw new Exception(
                            "HTTP lỗi: " + ((int)httpResponse.StatusCode).ToString() +
                            " - " + httpResponse.ReasonPhrase +
                            Environment.NewLine +
                            "Response: " + CatChuoi(json, 1000)
                        );
                    }

                    string trimmed = (json ?? "").Trim();

                    if (string.IsNullOrWhiteSpace(trimmed))
                    {
                        throw new Exception("Google Sheet API trả về rỗng.");
                    }

                    if (trimmed.StartsWith("<"))
                    {
                        throw new Exception(
                            "Google Sheet API đang trả về HTML, không phải JSON." +
                            Environment.NewLine +
                            "Thường do gọi sai Apps Script ghi dữ liệu, chưa deploy bản mới, hoặc Web App chưa để quyền Anyone." +
                            Environment.NewLine + Environment.NewLine +
                            "URL đang gọi:" +
                            Environment.NewLine +
                            url +
                            Environment.NewLine + Environment.NewLine +
                            "Response đầu:" +
                            Environment.NewLine +
                            CatChuoi(trimmed, 1000)
                        );
                    }

                    JObject result = JObject.Parse(trimmed);

                    bool success = result["success"] != null && result["success"].Value<bool>();

                    if (!success)
                    {
                        string errorMessage = result["message"] == null
                            ? "Lưu Google Sheet thất bại."
                            : result["message"].ToString();

                        throw new Exception(errorMessage);
                    }

                    return result["insertedRows"] == null
                        ? dt.Rows.Count
                        : result["insertedRows"].Value<int>();
                }
            }
        }

        private string BuildReadUrl(string action)
        {
            return _readBaseUrl
                + "?action=" + Uri.EscapeDataString(action)
                + "&token=" + Uri.EscapeDataString(_readToken);
        }

        private string BuildWriteUrl(string action)
        {
            return _writeBaseUrl
                + "?action=" + Uri.EscapeDataString(action)
                + "&token=" + Uri.EscapeDataString(_writeToken);
        }

        private async Task<SaveRowsApiResponse> PostRowsAsync(
    string action,
    List<Dictionary<string, object>> rows,
    string defaultErrorMessage,
    string idEpMangIn = null,
    int? phienBan = null)
        {
            if (string.IsNullOrWhiteSpace(action))
            {
                throw new Exception("Thiếu action gọi Google Sheet API.");
            }

            if (rows == null || rows.Count == 0)
            {
                throw new Exception("Không có dữ liệu để gửi lên Google Sheet.");
            }

            string url = BuildWriteUrl(action);

            var body = new Dictionary<string, object> { { "rows", rows } };
            if (!string.IsNullOrWhiteSpace(idEpMangIn))
            {
                body["IdEpMangIn"] = idEpMangIn;
                body["phienBan"] = phienBan;
            }

            string jsonBody =
                JsonConvert.SerializeObject(body);

            using (HttpClient client = new HttpClient())
            {
                client.Timeout =
                    TimeSpan.FromSeconds(120);

                using (StringContent content =
                    new StringContent(
                        jsonBody,
                        Encoding.UTF8,
                        "application/json"))
                {
                    HttpResponseMessage response =
                        await client.PostAsync(
                            url,
                            content);

                    string json =
                        await response.Content
                            .ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception(
                            "HTTP lỗi: " +
                            ((int)response.StatusCode) +
                            " - " +
                            response.ReasonPhrase +
                            Environment.NewLine +
                            "Response: " +
                            CatChuoi(json, 1000)
                        );
                    }

                    string trimmed =
                        (json ?? "").Trim();

                    if (string.IsNullOrWhiteSpace(trimmed))
                    {
                        throw new Exception(
                            "Google Sheet API trả về rỗng."
                        );
                    }

                    if (trimmed.StartsWith("<"))
                    {
                        throw new Exception(
                            "Google Sheet API đang trả về HTML, không phải JSON." +
                            Environment.NewLine +
                            "Kiểm tra URL Apps Script ghi dữ liệu, deploy và quyền Web App." +
                            Environment.NewLine +
                            "URL đang gọi:" +
                            Environment.NewLine +
                            url +
                            Environment.NewLine +
                            "Response đầu:" +
                            Environment.NewLine +
                            CatChuoi(trimmed, 1000)
                        );
                    }

                    SaveRowsApiResponse result =
                        JsonConvert.DeserializeObject<
                            SaveRowsApiResponse
                        >(trimmed);

                    if (result == null)
                    {
                        throw new Exception(
                            "API không trả về dữ liệu hợp lệ."
                        );
                    }

                    if (!result.success)
                    {
                        throw new Exception(
                            string.IsNullOrWhiteSpace(
                                result.message)
                                ? defaultErrorMessage
                                : result.message
                        );
                    }

                    return result;
                }
            }
        }

        private string CatChuoi(string text, int maxLength)
        {
            if (string.IsNullOrEmpty(text)) return "";

            if (text.Length <= maxLength) return text;

            return text.Substring(0, maxLength) + "...";
        }

        public async Task<DataTable> GetChiTietCanBatchRecentDaysAsync(int days)
        {
            string url = BuildReadUrl("getChiTietCanBatchRecentDays")
                + "&days=" + Uri.EscapeDataString(days.ToString());

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                string json = await client.GetStringAsync(url);
                string trimmed = (json ?? "").Trim();

                if (string.IsNullOrWhiteSpace(trimmed))
                    throw new Exception("Google Sheet API trả về rỗng.");

                if (trimmed.StartsWith("<"))
                    throw new Exception("Google Sheet API trả về HTML, không phải JSON. Kiểm tra URL /exec và deploy Apps Script.");

                JObject root = JObject.Parse(trimmed);

                bool success = root["success"] != null && root["success"].Value<bool>();

                if (!success)
                {
                    string message = root["message"] == null
                        ? "API trả về lỗi."
                        : root["message"].ToString();

                    throw new Exception(message);
                }

                JArray data = root["data"] as JArray;

                if (data == null)
                    return new DataTable();

                return ConvertJArrayToDataTable(data);
            }
        }

        private DataTable ConvertJArrayToDataTable(JArray array)
        {
            DataTable dt = new DataTable();

            if (array == null || array.Count == 0)
                return dt;

            foreach (JObject obj in array)
            {
                foreach (JProperty prop in obj.Properties())
                {
                    if (!dt.Columns.Contains(prop.Name))
                        dt.Columns.Add(prop.Name, typeof(string));
                }
            }

            foreach (JObject obj in array)
            {
                DataRow row = dt.NewRow();

                foreach (DataColumn col in dt.Columns)
                {
                    JToken token = obj[col.ColumnName];

                    row[col.ColumnName] = token == null || token.Type == JTokenType.Null
                        ? ""
                        : token.ToString();
                }

                dt.Rows.Add(row);
            }

            return dt;
        }

        public async Task<DataTable> GetChiTietTronLieuSanXuatRecentDaysAsync(int days)
        {
            string url = BuildReadUrl("getChiTietTronLieuSanXuatRecentDays")
                + "&days=" + Uri.EscapeDataString(days.ToString());

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                string json = await client.GetStringAsync(url);
                string trimmed = (json ?? "").Trim();

                if (string.IsNullOrWhiteSpace(trimmed))
                    throw new Exception("Google Sheet API trả về rỗng.");

                if (trimmed.StartsWith("<"))
                    throw new Exception("Google Sheet API trả về HTML, không phải JSON. Kiểm tra URL /exec và deploy Apps Script.");

                JObject root = JObject.Parse(trimmed);

                bool success = root["success"] != null && root["success"].Value<bool>();

                if (!success)
                {
                    string message = root["message"] == null
                        ? "API trả về lỗi."
                        : root["message"].ToString();

                    throw new Exception(message);
                }

                JArray data = root["data"] as JArray;

                if (data == null)
                    return new DataTable();

                return ConvertJArrayToDataTable(data);
            }
        }

        public async Task<int> SaveChiTietTronLieuSanXuatAsync(DataTable dt)
        {
            if (dt == null || dt.Rows.Count == 0)
                throw new Exception("Không có dữ liệu chiTietTronLieuSanXuat để lưu Google Sheet.");

            string url = BuildWriteUrl("saveChiTietTronLieuSanXuat");

            JArray rows = new JArray();

            foreach (DataRow dr in dt.Rows)
            {
                JObject obj = new JObject();

                foreach (DataColumn col in dt.Columns)
                {
                    object value = dr[col.ColumnName];

                    obj[col.ColumnName] = value == null || value == DBNull.Value
                        ? ""
                        : Convert.ToString(value);
                }

                rows.Add(obj);
            }

            JObject body = new JObject();
            body["rows"] = rows;

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                using (StringContent content = new StringContent(
                    body.ToString(),
                    Encoding.UTF8,
                    "application/json"))
                {
                    HttpResponseMessage httpResponse = await client.PostAsync(url, content);
                    string json = await httpResponse.Content.ReadAsStringAsync();

                    string trimmed = (json ?? "").Trim();

                    if (string.IsNullOrWhiteSpace(trimmed))
                        throw new Exception("Google Sheet API trả về rỗng.");

                    if (trimmed.StartsWith("<"))
                    {
                        throw new Exception(
                            "Google Sheet API đang trả về HTML, không phải JSON." +
                            Environment.NewLine +
                            "Thường do gọi sai Apps Script ghi dữ liệu, chưa deploy bản mới, hoặc Web App chưa để quyền Anyone." +
                            Environment.NewLine + Environment.NewLine +
                            "URL đang gọi:" +
                            Environment.NewLine +
                            url +
                            Environment.NewLine + Environment.NewLine +
                            "Response đầu:" +
                            Environment.NewLine +
                            CatChuoi(trimmed, 1000)
                        );
                    }

                    JObject result = JObject.Parse(trimmed);

                    bool success = result["success"] != null && result["success"].Value<bool>();

                    if (!success)
                    {
                        string errorMessage = result["message"] == null
                            ? "Lưu chiTietTronLieuSanXuat thất bại."
                            : result["message"].ToString();

                        throw new Exception(errorMessage);
                    }

                    return result["insertedRows"] == null
                        ? dt.Rows.Count
                        : result["insertedRows"].Value<int>();
                }
            }
        }

        public async Task<List<MeTronDaXacNhanDto>> GetMeTronDaXacNhanTodayAsync()
        {
            string url = $"{_readBaseUrl}?action=getMeTronDaXacNhanToday&token={Uri.EscapeDataString(_readToken)}";

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(60);

                string json = await client.GetStringAsync(url);

                ApiMeTronDaXacNhanTodayResponse res =
                    Newtonsoft.Json.JsonConvert.DeserializeObject<ApiMeTronDaXacNhanTodayResponse>(json);

                if (res == null)
                {
                    throw new Exception("API không trả về dữ liệu.");
                }

                if (!res.success)
                {
                    throw new Exception(res.message ?? "Không lấy được dữ liệu mẻ trộn đã xác nhận hôm nay.");
                }

                return res.data ?? new List<MeTronDaXacNhanDto>();
            }
        }

        public async Task<List<MeTronDaXacNhanDto>> GetMeTronDaXacNhanByDateAsync(DateTime date)
        {
            string dateText = date.ToString("yyyy-MM-dd");

            string url =
                $"{_readBaseUrl}?action=getMeTronDaXacNhanByDate" +
                $"&token={Uri.EscapeDataString(_readToken)}" +
                $"&date={Uri.EscapeDataString(dateText)}";

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(60);

                string json = await client.GetStringAsync(url);

                ApiMeTronDaXacNhanByDateResponse res =
                    Newtonsoft.Json.JsonConvert.DeserializeObject<ApiMeTronDaXacNhanByDateResponse>(json);

                if (res == null)
                {
                    throw new Exception("API không trả về dữ liệu.");
                }

                if (!res.success)
                {
                    throw new Exception(res.message ?? "Không lấy được dữ liệu mẻ trộn theo ngày.");
                }

                return res.data ?? new List<MeTronDaXacNhanDto>();
            }
        }

        public async Task<DataTable> GetChiTietTronLieuSanXuatByDateAsync(DateTime date)
        {
            string dateText = date.ToString("yyyy-MM-dd");

            string url = BuildReadUrl("getChiTietTronLieuSanXuatByDate")
                + "&date=" + Uri.EscapeDataString(dateText);

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                string json = await client.GetStringAsync(url);
                string trimmed = (json ?? "").Trim();

                if (string.IsNullOrWhiteSpace(trimmed))
                    throw new Exception("Google Sheet API trả về rỗng.");

                if (trimmed.StartsWith("<"))
                    throw new Exception("Google Sheet API trả về HTML, không phải JSON. Kiểm tra URL /exec và deploy Apps Script.");

                JObject root = JObject.Parse(trimmed);

                bool success = root["success"] != null && root["success"].Value<bool>();

                if (!success)
                {
                    string message = root["message"] == null
                        ? "API trả về lỗi."
                        : root["message"].ToString();

                    throw new Exception(message);
                }

                JArray data = root["data"] as JArray;

                if (data == null)
                    return new DataTable();

                return ConvertJArrayToDataTable(data);
            }
        }

        public async Task<SaveRowsApiResponse> SaveChiTietSanXuatBanThanhPhamAsync(DataTable dt)
        {
            if (dt == null || dt.Rows.Count == 0)
            {
                throw new Exception("Không có dữ liệu bán thành phẩm để lưu.");
            }

            List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();

            foreach (DataRow dr in dt.Rows)
            {
                Dictionary<string, object> obj = new Dictionary<string, object>();

                foreach (DataColumn col in dt.Columns)
                {
                    object value = dr[col];

                    obj[col.ColumnName] = value == null || value == DBNull.Value
                        ? ""
                        : value;
                }

                rows.Add(obj);
            }

            var body = new
            {
                rows = rows
            };

            string url = $"{_writeBaseUrl}?action=saveChiTietSanXuatBanThanhPham&token={Uri.EscapeDataString(_writeToken)}";

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                string jsonBody = Newtonsoft.Json.JsonConvert.SerializeObject(body);

                using (StringContent content = new StringContent(jsonBody, Encoding.UTF8, "application/json"))
                {
                    HttpResponseMessage response = await client.PostAsync(url, content);

                    string json = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception("HTTP lỗi: " + response.StatusCode + Environment.NewLine + json);
                    }

                    SaveRowsApiResponse res =
                        Newtonsoft.Json.JsonConvert.DeserializeObject<SaveRowsApiResponse>(json);

                    if (res == null)
                    {
                        throw new Exception("API không trả về dữ liệu.");
                    }

                    if (!res.success)
                    {
                        throw new Exception(res.message ?? "Không lưu được ChiTietSanXuatBanThanhPham.");
                    }

                    return res;
                }
            }
        }

        public async Task<SaveRowsApiResponse> SaveChiTietBTPtheoThungAsync(DataTable dt)
        {
            if (dt == null || dt.Rows.Count == 0)
            {
                throw new Exception("Không có dữ liệu ChiTietBTPtheoThung để lưu.");
            }

            List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();

            foreach (DataRow dr in dt.Rows)
            {
                Dictionary<string, object> obj = new Dictionary<string, object>();

                foreach (DataColumn col in dt.Columns)
                {
                    object value = dr[col];

                    obj[col.ColumnName] = value == null || value == DBNull.Value
                        ? ""
                        : value;
                }

                rows.Add(obj);
            }

            var body = new
            {
                rows = rows
            };

            string url = $"{_writeBaseUrl}?action=saveChiTietBTPtheoThung&token={Uri.EscapeDataString(_writeToken)}";

            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(120);

                string jsonBody = Newtonsoft.Json.JsonConvert.SerializeObject(body);

                using (StringContent content = new StringContent(jsonBody, Encoding.UTF8, "application/json"))
                {
                    HttpResponseMessage response = await client.PostAsync(url, content);

                    string json = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception("HTTP lỗi: " + response.StatusCode + Environment.NewLine + json);
                    }

                    SaveRowsApiResponse res =
                        Newtonsoft.Json.JsonConvert.DeserializeObject<SaveRowsApiResponse>(json);

                    if (res == null)
                    {
                        throw new Exception("API không trả về dữ liệu.");
                    }

                    if (!res.success)
                    {
                        throw new Exception(res.message ?? "Không lưu được ChiTietBTPtheoThung.");
                    }

                    return res;
                }
            }
        }

        public async Task<ApiLapViResponse> GetChiTietLapViByDateRangeAsync(DateTime ngayChon, int soNgayTruoc)
        {
            string dateText = ngayChon.ToString("yyyy-MM-dd");

            string url =
                _readBaseUrl +
                "?action=getChiTietLapViByDateRange" +
                "&token=" + Uri.EscapeDataString(_readToken) +
                "&date=" + Uri.EscapeDataString(dateText) +
                "&daysBefore=" + Uri.EscapeDataString(soNgayTruoc.ToString());

            using (HttpClient client = new HttpClient())
            {
                string json = await client.GetStringAsync(url);

                ApiLapViResponse res = JsonConvert.DeserializeObject<ApiLapViResponse>(json);

                if (res == null)
                    throw new Exception("API không trả về dữ liệu.");

                if (!res.success)
                    throw new Exception(string.IsNullOrWhiteSpace(res.message)
                        ? "API báo lỗi khi lấy dữ liệu lắp vỉ."
                        : res.message);

                if (res.headers == null)
                    res.headers = new List<string>();

                if (res.data == null)
                    res.data = new List<Dictionary<string, object>>();

                return res;
            }
        }

        public DataTable ConvertLapViToDataTable(ApiLapViResponse res)
        {
            DataTable dt = new DataTable();

            if (res == null)
                return dt;

            List<string> headers = res.headers ?? new List<string>();
            List<Dictionary<string, object>> rows = res.data ?? new List<Dictionary<string, object>>();

            List<string> priorityColumns = new List<string>
            {
                "maThanPham",
                "soLuongVi",
                "thoiGianTao"
            };

            List<string> finalHeaders = new List<string>();

            foreach (string col in priorityColumns)
            {
                if (headers.Contains(col) && !finalHeaders.Contains(col))
                    finalHeaders.Add(col);
            }

            foreach (string col in headers)
            {
                if (!string.IsNullOrWhiteSpace(col) && !finalHeaders.Contains(col))
                    finalHeaders.Add(col);
            }

            foreach (Dictionary<string, object> row in rows)
            {
                foreach (string key in row.Keys)
                {
                    if (!finalHeaders.Contains(key))
                        finalHeaders.Add(key);
                }
            }

            foreach (string col in finalHeaders)
            {
                dt.Columns.Add(col);
            }

            foreach (Dictionary<string, object> row in rows)
            {
                DataRow dr = dt.NewRow();

                foreach (string col in finalHeaders)
                {
                    object value;

                    if (row.TryGetValue(col, out value) && value != null)
                    {
                        if (value is JValue jValue)
                            dr[col] = jValue.Value == null ? "" : jValue.Value.ToString();
                        else
                            dr[col] = value.ToString();
                    }
                    else
                    {
                        dr[col] = "";
                    }
                }

                dt.Rows.Add(dr);
            }

            return dt;
        }

        public async Task<ApiBanThanhPhamResponse> GetChiTietSanXuatBanThanhPhamRecentMonthAsync()
        {
            string url =
                _readBaseUrl +
                "?action=getChiTietSanXuatBanThanhPhamRecentMonth" +
                "&token=" + Uri.EscapeDataString(_readToken);

            using (HttpClient client = new HttpClient())
            {
                string json = await client.GetStringAsync(url);

                ApiBanThanhPhamResponse res =
                    JsonConvert.DeserializeObject<ApiBanThanhPhamResponse>(json);

                if (res == null)
                    throw new Exception("API không trả về dữ liệu ChiTietSanXuatBanThanhPham.");

                if (!res.success)
                    throw new Exception(string.IsNullOrWhiteSpace(res.message)
                        ? "API báo lỗi khi lấy ChiTietSanXuatBanThanhPham."
                        : res.message);

                if (res.headers == null)
                    res.headers = new List<string>();

                if (res.data == null)
                    res.data = new List<Dictionary<string, object>>();

                return res;
            }
        }

        public DataTable ConvertDictionaryListToDataTable(
    List<Dictionary<string, object>> rows,
    List<string> headers,
    List<string> priorityColumns = null)
        {
            DataTable dt = new DataTable();

            rows = rows ?? new List<Dictionary<string, object>>();
            headers = headers ?? new List<string>();
            priorityColumns = priorityColumns ?? new List<string>();

            List<string> finalHeaders = new List<string>();

            foreach (string col in priorityColumns)
            {
                if (!string.IsNullOrWhiteSpace(col) &&
                    headers.Contains(col) &&
                    !finalHeaders.Contains(col))
                {
                    finalHeaders.Add(col);
                }
            }

            foreach (string col in headers)
            {
                if (!string.IsNullOrWhiteSpace(col) && !finalHeaders.Contains(col))
                    finalHeaders.Add(col);
            }

            foreach (Dictionary<string, object> row in rows)
            {
                foreach (string key in row.Keys)
                {
                    if (!finalHeaders.Contains(key))
                        finalHeaders.Add(key);
                }
            }

            foreach (string col in finalHeaders)
            {
                dt.Columns.Add(col);
            }

            foreach (Dictionary<string, object> row in rows)
            {
                DataRow dr = dt.NewRow();

                foreach (string col in finalHeaders)
                {
                    object value;

                    if (row.TryGetValue(col, out value) && value != null)
                    {
                        if (value is JValue jValue)
                            dr[col] = jValue.Value == null ? "" : jValue.Value.ToString();
                        else
                            dr[col] = value.ToString();
                    }
                    else
                    {
                        dr[col] = "";
                    }
                }

                dt.Rows.Add(dr);
            }

            return dt;
        }

        public async Task<List<KetQuaLapViModel>>
            GetKetQuaLapViAsync()
        {
            /*
                * GetAllDataAsync đã gọi:
                *
                * _readBaseUrl
                * ?action=getAllData
                * &token=...
                *
                * và trả về JObject data.
                */
            JObject allData =
                await GetAllDataAsync();

            if (allData == null)
            {
                throw new Exception(
                    "API không trả về dữ liệu getAllData."
                );
            }

            JToken token =
                allData["KetQuaLapVi"];

            if (token == null ||
                token.Type == JTokenType.Null)
            {
                throw new Exception(
                    "API getAllData chưa trả về mục KetQuaLapVi."
                );
            }

            JArray array =
                token as JArray;

            if (array == null)
            {
                throw new Exception(
                    "Dữ liệu KetQuaLapVi không đúng định dạng mảng."
                );
            }

            List<KetQuaLapViModel> result =
                array.ToObject<List<KetQuaLapViModel>>();

            return result ??
                    new List<KetQuaLapViModel>();
        }

        public async Task<List<KetQuaLapViModel>>
            GetKetQuaLapViByDateAsync(
        DateTime selectedDate)
        {
            /*
             * Lấy toàn bộ dữ liệu KetQuaLapVi
             * từ getAllData.
             */
            List<KetQuaLapViModel> allRows =
                await GetKetQuaLapViAsync();

            DateTime targetDate =
                selectedDate.Date;

            /*
             * Lọc theo ngày của thoiGianLuu,
             * không lọc theo ngaySanXuat.
             */
            List<KetQuaLapViModel> filtered =
                allRows
                    .Where(item =>
                        item != null &&
                        item.ThoiGianLuuValue.HasValue &&
                        item.ThoiGianLuuValue.Value.Date ==
                        targetDate
                    )
                    .OrderByDescending(item =>
                        item.ThoiGianLuuValue ??
                        DateTime.MinValue
                    )
                    .ToList();

            return filtered;
        }

        private bool TryParseApiDateTime(
            string text,
            out DateTime value)
        {
            value = DateTime.MinValue;

            if (string.IsNullOrWhiteSpace(text))
            {
                return false;
            }

            string[] formats =
            {
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd H:mm:ss",
                "yyyy-MM-dd",
                "dd/MM/yyyy HH:mm:ss",
                "d/M/yyyy H:mm:ss",
                "M/d/yyyy H:mm:ss",
                "MM/dd/yyyy HH:mm:ss"
            };

            return DateTime.TryParseExact(
                       text.Trim(),
                       formats,
                       System.Globalization.CultureInfo.InvariantCulture,
                       System.Globalization.DateTimeStyles.None,
                       out value
                   )
                   ||
                   DateTime.TryParse(
                       text.Trim(),
                       out value
                   );
        }

        public async Task<List<ChiTietBTPTheoThungModel>>
             GetChiTietBTPTheoThungAsync()
        {
            JObject allData =
                await GetAllDataAsync();

            if (allData == null)
            {
                return new List<ChiTietBTPTheoThungModel>();
            }

            JToken sheetToken =
                allData["ChiTietBTPtheoThung"];

            if (sheetToken == null ||
                sheetToken.Type != JTokenType.Array)
            {
                return new List<ChiTietBTPTheoThungModel>();
            }

            JArray array =
                (JArray)sheetToken;

            List<ChiTietBTPTheoThungModel> result =
                array.ToObject<
                    List<ChiTietBTPTheoThungModel>
                >();

            return result ??
                new List<ChiTietBTPTheoThungModel>();
        }

        public async Task<List<ChiTietBTPTheoThungModel>>
            GetChiTietBTPTheoThungByDateAsync(
            DateTime selectedDate)
        {
            List<ChiTietBTPTheoThungModel> allRows =
                await GetChiTietBTPTheoThungAsync();

            List<ChiTietBTPTheoThungModel> filtered =
                allRows
                    .Where(item =>
                        item != null &&
                        item.NgaySanXuatValue.HasValue &&
                        item.NgaySanXuatValue.Value.Date ==
                        selectedDate.Date
                    )
                    .OrderBy(item =>
                        item.SttThung ??
                        int.MaxValue
                    )
                    .ThenBy(item =>
                        item.IdThungBanThanhPham
                    )
                    .ToList();

            return filtered;
        }

        public async Task<CongDoanEpMangInData>
            GetCongDoanEpMangInTheoSoNgayAsync(int soNgay)
        {
            JObject allData = await GetAllDataAsync();

            if (allData == null)
            {
                throw new Exception(
                    "API getAllData không trả về dữ liệu."
                );
            }

            if (soNgay <= 0)
            {
                soNgay = 15;
            }

            CongDoanEpMangInData result =
                new CongDoanEpMangInData();

            // Bao gồm ngày hôm nay
            DateTime fromDate =
                DateTime.Today.AddDays(-(soNgay - 1));

            DateTime toDate =
                DateTime.Today.AddDays(1);

            // ==============================
            // 1. Kế hoạch lắp vỉ
            // ==============================
            JArray keHoachArray =
                allData["KeHoachLapViVTBC"] as JArray;

            if (keHoachArray != null)
            {
                List<KeHoachLapViVTBCModel> allKeHoach =
                    keHoachArray.ToObject<
                        List<KeHoachLapViVTBCModel>
                    >()
                    ?? new List<KeHoachLapViVTBCModel>();

                result.KeHoachLapVi =
                    allKeHoach
                        .Where(item =>
                            item != null &&
                            item.ThoiGianTaoValue.HasValue &&
                            item.ThoiGianTaoValue.Value >= fromDate &&
                            item.ThoiGianTaoValue.Value < toDate
                        )
                        .OrderByDescending(item =>
                            item.ThoiGianTaoValue ??
                            DateTime.MinValue
                        )
                        .ThenBy(item => item.STT)
                        .ToList();
            }

            // ==============================
            // 2. Chi tiết BTP theo thùng
            // ==============================
            JArray chiTietBtpArray =
                allData["ChiTietBTPtheoThung"] as JArray;

            if (chiTietBtpArray != null)
            {
                List<ChiTietBTPTheoThungModel> allChiTietBtp =
                    chiTietBtpArray.ToObject<
                        List<ChiTietBTPTheoThungModel>
                    >()
                    ?? new List<ChiTietBTPTheoThungModel>();

                result.ChiTietBTPTheoThung =
                    allChiTietBtp
                        .Where(item =>
                            item != null &&
                            item.NgaySanXuatValue.HasValue &&
                            item.NgaySanXuatValue.Value >= fromDate &&
                            item.NgaySanXuatValue.Value < toDate
                        )
                        .OrderByDescending(item =>
                            item.NgaySanXuatValue ??
                            DateTime.MinValue
                        )
                        .ThenBy(item =>
                            item.SttThung ??
                            int.MaxValue
                        )
                        .ThenBy(item =>
                            item.IdThungBanThanhPham
                        )
                        .ToList();
            }

            // ==============================
            // 3. Kết quả lắp vỉ
            // ==============================
            JArray ketQuaLapViArray =
                allData["KetQuaLapVi"] as JArray;

            if (ketQuaLapViArray != null)
            {
                List<KetQuaLapViModel> allKetQua =
                    ketQuaLapViArray.ToObject<
                        List<KetQuaLapViModel>
                    >()
                    ?? new List<KetQuaLapViModel>();

                result.KetQuaLapVi =
                    allKetQua
                        .Where(item =>
                            item != null &&
                            item.ThoiGianLuuValue.HasValue &&
                            item.ThoiGianLuuValue.Value >= fromDate &&
                            item.ThoiGianLuuValue.Value < toDate
                        )
                        .OrderByDescending(item =>
                            item.ThoiGianLuuValue ??
                            DateTime.MinValue
                        )
                        .ToList();
            }

            return result;
        }

        public async Task<SaveRowsApiResponse>
    SaveEpMangInAsync(
        string idThungDungVi,
        string noiDungDongTren,
        string noiDungDongDuoi,
        DateTime thoiGianLuu,
        string nguoiLuu,
        string nhietDoTamTren = "",
        string nhietDoTamDuoi = "",
        string giaNhietGio = "",
        string tocDoCat = "",
        string idEpMangIn = "",
        int phienBan = 0)
        {
            idThungDungVi =
                (idThungDungVi ?? "").Trim();

            noiDungDongTren =
                (noiDungDongTren ?? "").Trim();

            noiDungDongDuoi =
                (noiDungDongDuoi ?? "").Trim();

            nguoiLuu =
                (nguoiLuu ?? "").Trim();

            if (string.IsNullOrWhiteSpace(
                idThungDungVi))
            {
                throw new Exception(
                    "Thiếu IdThungDungVi."
                );
            }

            if (string.IsNullOrWhiteSpace(
                noiDungDongTren))
            {
                throw new Exception(
                    "Thiếu nội dung dòng trên."
                );
            }

            if (string.IsNullOrWhiteSpace(
                noiDungDongDuoi))
            {
                throw new Exception(
                    "Thiếu nội dung dòng dưới."
                );
            }

            if (string.IsNullOrWhiteSpace(
                nguoiLuu))
            {
                throw new Exception(
                    "Thiếu người lưu."
                );
            }

            List<Dictionary<string, object>> rows =
                new List<Dictionary<string, object>>();

            Dictionary<string, object> row =
                new Dictionary<string, object>();

            row["IdThungDungVi"] =
                idThungDungVi;

            row["noiDungDongTren"] =
                noiDungDongTren;

            row["noiDungDongDuoi"] =
                noiDungDongDuoi;

            row["thoiGianLuu"] =
                thoiGianLuu.ToString(
                    "yyyy-MM-dd HH:mm:ss");

            row["nguoiLuu"] =
                nguoiLuu;

            row["nhietDoTamTren"] = (nhietDoTamTren ?? "").Trim();
            row["nhietDoTamDuoi"] = (nhietDoTamDuoi ?? "").Trim();
            row["giaNhietGio"] = (giaNhietGio ?? "").Trim();
            row["TocDoCat"] = (tocDoCat ?? "").Trim();

            rows.Add(row);

            return await PostRowsAsync(
                "saveEpMangIn",
                rows,
                "Không lưu được dữ liệu EpMangIn.",
                idEpMangIn,
                phienBan
            );
        }

        public async Task<SaveRowsApiResponse>
        SaveEpMangInAsync(
            string idThungDungVi,
            string noiDungDongTren,
            string noiDungDongDuoi,
            string nguoiLuu)
        {
            return await SaveEpMangInAsync(
                idThungDungVi,
                noiDungDongTren,
                noiDungDongDuoi,
                DateTime.Now,
                nguoiLuu
            );
        }

        public async Task<SaveRowsApiResponse>
        SaveDongThungAsync(
            string noiDungNSXTrenVi,
            string noiDungDongTren,
            string noiDungDongDuoi,
            DateTime thoiGianLuu,
            string nguoiLuu,
            string ngayInDateVi)
        {
            noiDungNSXTrenVi =
                (noiDungNSXTrenVi ?? "").Trim();

            noiDungDongTren =
                (noiDungDongTren ?? "").Trim();

            noiDungDongDuoi =
                (noiDungDongDuoi ?? "").Trim();

            nguoiLuu =
                (nguoiLuu ?? "").Trim();

            ngayInDateVi =
                (ngayInDateVi ?? "").Trim();

            if (string.IsNullOrWhiteSpace(
                noiDungNSXTrenVi))
            {
                throw new Exception(
                    "Thiếu nội dung NSX trên vỉ."
                );
            }

            if (string.IsNullOrWhiteSpace(
                noiDungDongTren))
            {
                throw new Exception(
                    "Thiếu nội dung dòng trên."
                );
            }

            if (string.IsNullOrWhiteSpace(
                noiDungDongDuoi))
            {
                throw new Exception(
                    "Thiếu nội dung dòng dưới."
                );
            }

            if (string.IsNullOrWhiteSpace(
                nguoiLuu))
            {
                throw new Exception(
                    "Thiếu người lưu."
                );
            }

            if (string.IsNullOrWhiteSpace(
                ngayInDateVi))
            {
                throw new Exception(
                    "Thiếu ngày in date vỉ."
                );
            }

            List<Dictionary<string, object>> rows =
                new List<Dictionary<string, object>>();

            Dictionary<string, object> row =
                new Dictionary<string, object>();

            row["noiDungNSXTrenVi"] =
                noiDungNSXTrenVi;

            row["noiDungDongTren"] =
                noiDungDongTren;

            row["noiDungDongDuoi"] =
                noiDungDongDuoi;

            row["thoiGianLuu"] =
                thoiGianLuu.ToString(
                    "yyyy-MM-dd HH:mm:ss"
                );

            row["nguoiLuu"] =
                nguoiLuu;

            /*
             * Dữ liệu lấy từ txtNgayInDateVi.
             */
            row["ngayInDateVi"] =
                ngayInDateVi;

            rows.Add(row);

            return await PostRowsAsync(
                "saveDongThung",
                rows,
                "Không lưu được dữ liệu DongThung."
            );
        }

        public async Task<SaveRowsApiResponse>
        SaveDongThungAsync(
            string noiDungNSXTrenVi,
            string noiDungDongTren,
            string noiDungDongDuoi,
            string nguoiLuu,
            string ngayInDateVi)
        {
            return await SaveDongThungAsync(
                noiDungNSXTrenVi,
                noiDungDongTren,
                noiDungDongDuoi,
                DateTime.Now,
                nguoiLuu,
                ngayInDateVi
            );
        }
    }
}
