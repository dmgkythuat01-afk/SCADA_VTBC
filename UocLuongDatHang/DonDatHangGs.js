/*******************************************************
 * MODULE ĐƠN ĐẶT HÀNG - CARD TẠO ĐƠN ĐẶT HÀNG
 *
 * File backend riêng.
 * Vòng 1 chỉ đọc tiêu đề từ sheet CauHinhDonDatHang.
 *
 * Sheet:
 * CauHinhDonDatHang
 * - key
 * - giaTri
 * - ghiChu
 *******************************************************/

/**
 * ==================================================
 * THƯ MỤC LƯU ẢNH PO
 * ==================================================
 *
 * Có thể nhập:
 *
 * 1. Folder ID:
 *    1Abcxxxxxxxxxxxxxxxx
 *
 * hoặc
 *
 * 2. Full link:
 *    https://drive.google.com/drive/folders/1Abcxxxxxxxxxxxxxxxx
 *
 * Bạn điền sau.
 */
const Image_PO_Link = 'https://drive.google.com/drive/folders/1J4tHUuSeX62JhG2WjpLIdOJye8r_j1I6';


/**
 * Trả về cấu hình tiêu đề của Card Tạo đơn đặt hàng.
 *
 * Không dùng APP.SHEETS để module này độc lập với Code.gs.
 */
function getCauHinhDonDatHang() {

  const SHEET_NAME =
    'CauHinhDonDatHang';


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      SHEET_NAME
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet "' +
      SHEET_NAME +
      '".'
    );

  }


  const values =
    sheet
      .getDataRange()
      .getDisplayValues();


  if (
    !values ||
    values.length < 2
  ) {

    return {
      ok: true,
      config: {}
    };

  }


  const headers =
    values[0]
      .map(item =>
        String(
          item || ''
        ).trim()
      );


  const keyIndex =
    headers.indexOf(
      'key'
    );

  const valueIndex =
    headers.indexOf(
      'giaTri'
    );

  const fixedValueIndex =
    headers.indexOf(
      'giaTriCoDinh'
    );


  if (
    keyIndex < 0 ||
    valueIndex < 0
  ) {

    throw new Error(
      'Sheet CauHinhDonDatHang phải có cột key và giaTri.'
    );

  }


  const config = {};
  const fixedValues = {};


  values
    .slice(1)
    .forEach(row => {

      const key =
        String(
          row[keyIndex] || ''
        ).trim();


      if (!key) {
        return;
      }


      config[key] =
        String(
          row[valueIndex] || ''
        );

      if (
        fixedValueIndex >= 0
      ) {

        fixedValues[key] =
          String(
            row[fixedValueIndex] || ''
          );

      }

    });


  return {

    ok: true,

    config:
      config,

    fixedValues:
      fixedValues

  };

}

/*******************************************************
 * KHỞI TẠO + LƯU ĐƠN ĐẶT HÀNG
 *******************************************************/


/**
 * Lấy:
 * - ngày hôm nay
 * - số đơn dự kiến tiếp theo
 *
 * VD:
 * 25/08/2026
 *
 * DN-01250826
 */
function getDonDatHangKhoiTao() {

  const now =
    new Date();


  return {

    ok: true,

    ngay:
      formatPoDateInput_(
        now
      ),

    soDonDatHang:
      getNextPoNumber_(
        now
      )

  };

}



/**
 * Lưu Card Đơn đặt hàng.
 *
 * Quan trọng:
 * Backend tự tạo lại số PO
 * tại thời điểm lưu để tránh trùng số.
 */
function saveDonDatHangCardData(
  payload
) {

  payload =
    payload || {};


  const items =
    Array.isArray(
      payload.items
    )
      ? payload.items
      : [];


  /*
   * ========================================
   * PHẢI CÓ ÍT NHẤT 1 HÀNG HÓA
   * ========================================
   */

  if (!items.length) {

    throw new Error(
      'Đơn đặt hàng chưa có nguyên liệu/hàng hóa.'
    );

  }


  const lock =
    LockService
      .getScriptLock();


  lock.waitLock(
    30000
  );


  try {

    const ss =
      SpreadsheetApp
        .getActiveSpreadsheet();


    const sheet =
      ss.getSheetByName(
        'DonDatHang'
      );


    if (!sheet) {

      throw new Error(
        'Không tìm thấy sheet DonDatHang.'
      );

    }


    /*
     * ========================================
     * 1. NGÀY ĐƠN
     * ========================================
     */

    const ngayDon =
      parsePoDateInput_(
        payload.ngay
      )
      ||
      new Date();


    /*
     * ========================================
     * 2. CẤP SỐ ĐƠN
     * ========================================
     *
     * Luôn tính lại lúc lưu
     * để tránh trùng số giữa nhiều người dùng.
     */

    const soDonDatHang =
      getNextPoNumber_(
        ngayDon
      );


    /*
     * ========================================
     * 3. MÃ ĐƠN HÀNG NỘI BỘ
     * ========================================
     *
     * Tất cả dòng hàng hóa trong cùng PO
     * dùng chung mã này.
     */

    const now = new Date();

    const maDonHangDat =
      'MDH-' +
      Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        'ddMMyyyy-HHmmss-SSS'
      );

    const thoiGianTao = Utilities.formatDate(
      now,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy HH:mm:ss'
    );


    /*
     * ========================================
     * 4. HEADER SHEET DonDatHang
     * ========================================
     */

    const lastColumn =
      sheet.getLastColumn();


    if (
      lastColumn < 1
    ) {

      throw new Error(
        'Sheet DonDatHang chưa có dòng tiêu đề.'
      );

    }


    const headers =
      sheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0]
        .map(item =>
          String(
            item || ''
          ).trim()
        );


    /*
     * ========================================
     * 5. LẤY CẤU HÌNH HEADER / TEXT CỐ ĐỊNH
     * ========================================
     */

    const cauHinh =
      getCauHinhDonDatHang();


    const config =
      cauHinh?.config ||
      {};


    /*
     * ========================================
     * 6. TỔNG CỘNG
     * ========================================
     */

    const tongCong =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.thanhTien ||
            0
          ),
        0
      );


    /*
     * ========================================
     * 7. LOẠI ĐƠN GIÁ
     * ========================================
     */

    const loaiDonGia =
      String(
        payload.loaiDonGia ||
        'coThue'
      );


    /*
     * ========================================
     * 8. THỜI GIAN GIAO HÀNG
     * ========================================
     */

    const thoiGianGiaoHang =
      parsePoDateInput_(
        payload.thoiGianGiaoHang
      )
      ||
      payload.thoiGianGiaoHang
      ||
      '';


    /*
     * ========================================
     * 9. DỮ LIỆU CHUNG CỦA CẢ ĐƠN
     * ========================================
     */

    const commonRecord = {

      /*
       * Các thông tin mẫu cố định.
       */
      tieuDeCongTy:
        config.tieuDeCongTy ||
        '',

      tenCongTyPhanChuKy:
        config.tenCongTyPhanChuKy ||
        '',

      tieuDeDonDatHang:
        config.tieuDeDonDatHang ||
        '',


      /*
       * Thông tin đơn.
       */
      tieuDeNgay:
        ngayDon,

      tieuDeSoDonDatHang:
        soDonDatHang,

      tieuDeTrang:
        payload.trang ||
        '1/1',


      /*
       * Thông tin bên mua / NCC.
       */
      benMua:
        payload.benMua ||
        '',

      tieuDeNhaSanXuat:
        payload.nhaSanXuat ||
        '',

      tieuDeDonViVanChuyenChoNCC:
        payload.donViVanChuyen ||
        '',


      /*
       * Thông tin nội dung đơn.
       */
      tieuDeTheoDeNghi:
        payload.theoDeNghi ||
        '',

      tieuDeNoiDung:
        payload.noiDung ||
        '',

      tieuDeNguoiLienHe:
        payload.nguoiLienHe ||
        '',

      tieuDePhuongThucThanhToan:
        payload.phuongThucThanhToan ||
        '',

      tieuDeThoiGianGiaoHang:
        thoiGianGiaoHang,

      tieuDeCangDen:
        payload.cangDen ||
        '',


      /*
       * Tổng tiền toàn đơn.
       */
      tieuDeTongCong:
        tongCong,


      /*
      * ID dùng để gom nhiều dòng
      * thành cùng một đơn hàng.
      */
      maDonHangDat:
        maDonHangDat,

      thoiGianTao:
        thoiGianTao,


      /*
      * Trạng thái PO ban đầu.
      */
      trangThaiPO:
        'Đã tạo',

      anhPO:
        ''

    };


    /*
     * ========================================
     * 10. TẠO 1 RECORD CHO MỖI HÀNG HÓA
     * ========================================
     */

    const records =
      items.map(
        (
          item,
          index
        ) => {

          const donGia =
            Number(
              item.donGia ||
              0
            );


          const thanhTien =
            Number(
              item.thanhTien ||
              0
            );


          const record = {

            /*
             * Copy toàn bộ thông tin chung.
             */
            ...commonRecord,


            /*
             * STT hàng hóa.
             */
            tieuDeStt:
              index + 1,


            /*
             * Mã hàng.
             */
            tieuDeMaHangHoa:
              item.maHangHoa ||
              '',


            /*
             * Tên hàng:
             * tiếng Việt + tiếng Trung.
             */
            tieuDeTenHangHoa:
              item.tenHangHoa ||
              '',


            /*
             * Đơn vị tính.
             */
            tieuDeDonViTinh:
              item.donViTinh ||
              '',


            /*
             * Số lượng.
             */
            tieuDeSoLuong:
              Number(
                item.soLuong ||
                0
              ),


            /*
             * Thành tiền dòng.
             */
            tieuDeThanhTien:
              thanhTien,


            /*
             * Thông số kỹ thuật.
             */
            tieuDeThongSoKyThuat:
              item.thongSoKyThuat ||
              ''

          };


          /*
           * ====================================
           * ĐƠN GIÁ CÓ THUẾ / KHÔNG THUẾ
           * ====================================
           *
           * Chỉ điền đúng một cột.
           */

          if (
            loaiDonGia ===
            'coThue'
          ) {

            record
              .tieuDeDonGiaGomThue =
                donGia;

            record
              .tieuDeDonGiaChuaGomThue =
                '';

          } else {

            record
              .tieuDeDonGiaGomThue =
                '';

            record
              .tieuDeDonGiaChuaGomThue =
                donGia;

          }


          return record;

        }
      );


    /*
     * ========================================
     * 11. MAP RECORD THEO HEADER THỰC TẾ
     * ========================================
     */

    const values =
      records.map(
        record =>
          headers.map(
            header => {

              if (
                Object.prototype
                  .hasOwnProperty
                  .call(
                    record,
                    header
                  )
              ) {

                return record[
                  header
                ];

              }


              return '';

            }
          )
      );


    /*
     * ========================================
     * 12. GHI NHIỀU DÒNG 1 LẦN
     * ========================================
     */

    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        values.length,
        headers.length
      )
      .setValues(
        values
      );


    SpreadsheetApp.flush();


    /*
     * ========================================
     * 13. RETURN
     * ========================================
     */

    return {

      ok: true,

      soDonDatHang:
        soDonDatHang,

      maDonHangDat:
        maDonHangDat,

      ngay:
        formatPoDateInput_(
          ngayDon
        ),

      soDongDaLuu:
        values.length

    };


  } finally {

    lock.releaseLock();

  }

}



/**
 * Sinh số PO tiếp theo.
 *
 * Format:
 *
 * DN-01ddMMyy
 *
 * VD:
 *
 * DN-01250826
 * DN-02250826
 */
function getNextPoNumber_(
  date
) {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      'DonDatHang'
    );


  const tz =
    Session
      .getScriptTimeZone()
    ||
    'Asia/Ho_Chi_Minh';


  /*
   * Phần ngày:
   *
   * 25/08/2026
   * =>
   * 250826
   */
  const datePart =
    Utilities.formatDate(
      date,
      tz,
      'ddMMyy'
    );


  /*
   * Nếu chưa có sheet
   * hoặc chưa có dữ liệu
   * thì đơn đầu tiên = 01.
   */
  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {

    return (
      'DN-' +
      '01' +
      datePart
    );

  }


  const lastColumn =
    sheet.getLastColumn();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0]
      .map(item =>
        String(
          item || ''
        ).trim()
      );


  /*
   * ĐÚNG CỘT BẠN YÊU CẦU.
   */
  const poColumnIndex =
    headers.indexOf(
      'tieuDeSoDonDatHang'
    );


  if (
    poColumnIndex < 0
  ) {

    throw new Error(
      'Sheet DonDatHang chưa có cột tieuDeSoDonDatHang.'
    );

  }


  const values =
    sheet
      .getRange(
        2,
        poColumnIndex + 1,
        sheet.getLastRow() - 1,
        1
      )
      .getDisplayValues();


  let maxStt = 0;


  values.forEach(row => {

    const value =
      String(
        row[0] ||
        ''
      ).trim();


    /*
     * Format cần đọc:
     *
     * DN-01250826
     *
     * DN-
     * 01      = STT
     * 250826  = ngày
     */

    const match =
      value.match(
        /^DN-(\d{2})(\d{6})$/
      );


    if (!match) {

      return;

    }


    const stt =
      Number(
        match[1]
      );


    const rowDatePart =
      match[2];


    /*
     * Chỉ đếm đơn của đúng ngày.
     */
    if (
      rowDatePart !==
      datePart
    ) {

      return;

    }


    if (
      stt >
      maxStt
    ) {

      maxStt =
        stt;

    }

  });


  const nextStt =
    maxStt + 1;


  return (
    'DN-' +
    String(
      nextStt
    ).padStart(
      2,
      '0'
    ) +
    datePart
  );

}



/**
 * yyyy-mm-dd
 * dùng cho input type=date.
 */
function formatPoDateInput_(
  date
) {

  if (!date) {
    return '';
  }


  const tz =
    Session
      .getScriptTimeZone()
    ||
    'Asia/Ho_Chi_Minh';


  return Utilities.formatDate(
    date,
    tz,
    'yyyy-MM-dd'
  );

}



/**
 * Parse input yyyy-mm-dd
 * thành Date local.
 */
function parsePoDateInput_(
  value
) {

  const text =
    String(
      value || ''
    ).trim();


  /*
   * ========================================
   * dd/mm/yyyy
   * ========================================
   */

  let match =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );


  if (match) {

    return new Date(

      Number(
        match[3]
      ),

      Number(
        match[2]
      ) - 1,

      Number(
        match[1]
      )

    );

  }


  /*
   * ========================================
   * yyyy-mm-dd
   * Giữ hỗ trợ để tương thích code cũ.
   * ========================================
   */

  match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (match) {

    return new Date(

      Number(
        match[1]
      ),

      Number(
        match[2]
      ) - 1,

      Number(
        match[3]
      )

    );

  }


  return null;

}

/**
 * ==========================================
 * DANH SÁCH ĐƠN VỊ CHUYỂN TIỀN
 * ==========================================
 *
 * Sheet:
 * DonViChuyenTien
 *
 * Cột:
 * donViChuyenTien
 */
function getDanhSachDonViChuyenTien() {

  const SHEET_NAME =
    'DonViChuyenTien';


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      SHEET_NAME
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet DonViChuyenTien.'
    );

  }


  const values =
    sheet
      .getDataRange()
      .getDisplayValues();


  if (
    !values ||
    values.length < 2
  ) {

    return {
      ok: true,
      rows: []
    };

  }


  const headers =
    values[0]
      .map(item =>
        String(
          item || ''
        ).trim()
      );


  const columnIndex =
    headers.indexOf(
      'donViChuyenTien'
    );


  if (
    columnIndex < 0
  ) {

    throw new Error(
      'Sheet DonViChuyenTien chưa có cột donViChuyenTien.'
    );

  }


  /*
   * Lấy danh sách:
   * - bỏ dòng trống
   * - bỏ trùng
   */
  const rows =
    [
      ...new Set(
        values
          .slice(1)
          .map(row =>
            String(
              row[columnIndex] ||
              ''
            ).trim()
          )
          .filter(Boolean)
      )
    ];


  return {

    ok: true,

    rows:
      rows

  };

}

/**
 * ==========================================
 * DANH SÁCH TẤT CẢ NGUYÊN LIỆU
 * CHO FORM ĐẶT HÀNG
 * ==========================================
 *
 * Nguồn:
 * sheet TonKho
 *
 * Dùng:
 * - tenNguyenLieu để tìm/chọn
 *
 * Trả thêm:
 * - maNguyenLieu
 * - MaKeToan
 * - donVi
 *
 * để prompt sau có thể tự điền
 * vào dòng đơn đặt hàng.
 */
function getDanhSachNguyenLieuDonDatHang() {

  const SHEET_NAME =
    'TonKho';


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      SHEET_NAME
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet TonKho.'
    );

  }


  const values =
    sheet
      .getDataRange()
      .getDisplayValues();


  if (
    !values ||
    values.length < 2
  ) {

    return {
      ok: true,
      rows: []
    };

  }


  const headers =
    values[0]
      .map(item =>
        String(
          item || ''
        ).trim()
      );


  const tenIndex =
    headers.indexOf(
      'tenNguyenLieu'
    );

  const maIndex =
    headers.indexOf(
      'maNguyenLieu'
    );

  const maKeToanIndex =
    headers.indexOf(
      'MaKeToan'
    );

  const donViIndex =
    headers.indexOf(
      'donVi'
    );


  if (
    tenIndex < 0
  ) {

    throw new Error(
      'Sheet TonKho chưa có cột tenNguyenLieu.'
    );

  }


  /*
   * ==========================================
   * GOM NGUYÊN LIỆU
   * ==========================================
   *
   * TonKho có thể có nhiều Lot
   * của cùng nguyên liệu.
   *
   * Không được list lặp lại
   * tên nguyên liệu trong combobox.
   */
  const map = {};


  values
    .slice(1)
    .forEach(row => {

      const tenNguyenLieu =
        String(
          row[tenIndex] ||
          ''
        ).trim();


      if (!tenNguyenLieu) {
        return;
      }


      const maNguyenLieu =
        maIndex >= 0
          ? String(
              row[maIndex] ||
              ''
            ).trim()
          : '';


      const MaKeToan =
        maKeToanIndex >= 0
          ? String(
              row[maKeToanIndex] ||
              ''
            ).trim()
          : '';


      const donVi =
        donViIndex >= 0
          ? String(
              row[donViIndex] ||
              ''
            ).trim()
          : '';


      /*
       * Ưu tiên mã để phân biệt.
       *
       * Nếu không có mã,
       * dùng tên nguyên liệu.
       */
      const key =
        maNguyenLieu ||
        MaKeToan ||
        tenNguyenLieu;


      if (
        !map[key]
      ) {

        map[key] = {

          maNguyenLieu:
            maNguyenLieu,

          MaKeToan:
            MaKeToan,

          tenNguyenLieu:
            tenNguyenLieu,

          donVi:
            donVi

        };

      }

    });


  const rows =
    Object
      .values(
        map
      )
      .sort(
        (
          a,
          b
        ) =>
          String(
            a.tenNguyenLieu ||
            ''
          ).localeCompare(
            String(
              b.tenNguyenLieu ||
              ''
            ),
            'vi'
          )
      );


  return {

    ok: true,

    rows:
      rows

  };

}

/**
 * ==========================================
 * CHI TIẾT XUẤT NHẬP KHẨU THEO NGUYÊN LIỆU
 * ==========================================
 */
function getThongTinXuatNhapKhauTheoNguyenLieu(
  tenNguyenLieu
) {

  tenNguyenLieu =
    String(
      tenNguyenLieu || ''
    ).trim();


  if (!tenNguyenLieu) {

    throw new Error(
      'Chưa chọn nguyên liệu.'
    );

  }


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      'XuatNhapKhau'
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet XuatNhapKhau.'
    );

  }


  const values =
    sheet
      .getDataRange()
      .getDisplayValues();


  if (
    !values ||
    values.length < 2
  ) {

    throw new Error(
      'Sheet XuatNhapKhau chưa có dữ liệu.'
    );

  }


  const headers =
    values[0]
      .map(item =>
        String(
          item || ''
        ).trim()
      );


  const index = {};

  headers.forEach(
    (
      header,
      i
    ) => {

      if (header) {
        index[header] = i;
      }

    }
  );


  if (
    index.tenNguyenLieu ===
    undefined
  ) {

    throw new Error(
      'XuatNhapKhau chưa có cột tenNguyenLieu.'
    );

  }


  const row =
    values
      .slice(1)
      .find(r =>
        String(
          r[
            index.tenNguyenLieu
          ] || ''
        ).trim() ===
        tenNguyenLieu
      );


  if (!row) {

    throw new Error(
      'Không tìm thấy "' +
      tenNguyenLieu +
      '" trong sheet XuatNhapKhau.'
    );

  }


  const get =
    header => {

      const i =
        index[header];

      if (
        i === undefined
      ) {
        return '';
      }

      return String(
        row[i] || ''
      ).trim();

    };


   
  return {

    ok: true,

    data: {

      maNguyenLieu:
        get(
          'maNguyenLieu'
        ),

      MaKeToan:
        get(
          'MaKeToan'
        ),

      tenNguyenLieu:
        get(
          'tenNguyenLieu'
        ),

      donViKho:
        get(
          'donViKho'
        ),

      tenHangNhapKhau:
        get(
          'tenHangNhapKhau'
        ),

      tenTiengTrung:
        get(
          'tenTiengTrung'
        ),

      thongSoKyThuat:
        get(
          'thongSoKyThuat'
        ),

      donGiaBaoGomVAT:
        Number(
          get(
            'donGiaBaoGomVAT'
          ) || 0
        ),

      donGiaKhongBaoGomVAT:
        Number(
          get(
            'donGiaKhongBaoGomVAT'
          ) || 0
        ),

      nhaCungCap1:
        get(
          'nhaCungCap1'
        ),

      nhaCungCap2:
        get(
          'nhaCungCap2'
        ),

      nhaCungCap3:
        get(
          'nhaCungCap3'
        ),

      phuongThucTTNCC1:
        get(
          'phuongThucTTNCC1'
        ),

      phuongThucTTNCC2:
        get(
          'phuongThucTTNCC2'
        ),

      phuongThucTTNCC3:
        get(
          'phuongThucTTNCC3'
        ),

      nguoiLienHe:
        get(
          'nguoiLienHe'
        ),

      donViChuyenTienNCC:
        get(
          'donViChuyenTienNCC'
        ),

      benMua:
        get(
          'benMua'
        ),

      ngayDuKienGiaoHangTaiXuong:
        Number(
          get(
            'ngayDuKienGiaoHangTaiXuong'
          ) || 0
        ),

      NgayDongCong:
        get(
          'NgayDongCong'
        ),

      ngayHangVeDuKien:
        get(
          'ngayHangVeDuKien'
        )

    }

  };

}


/**
 * ==========================================
 * DANH SÁCH CẢNG ĐẾN
 *
 * Nguồn:
 * DonViChuyenTien.cangDen
 * ==========================================
 */
function getDanhSachCangDenDonDatHang() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      'DonViChuyenTien'
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet DonViChuyenTien.'
    );

  }


  const values =
    sheet
      .getDataRange()
      .getDisplayValues();


  if (
    !values ||
    values.length < 2
  ) {

    return {
      ok: true,
      rows: []
    };

  }


  const headers =
    values[0]
      .map(item =>
        String(
          item || ''
        ).trim()
      );


  const cangIndex =
    headers.indexOf(
      'cangDen'
    );


  if (
    cangIndex < 0
  ) {

    throw new Error(
      'DonViChuyenTien chưa có cột cangDen.'
    );

  }


  const rows =
    [
      ...new Set(
        values
          .slice(1)
          .map(row =>
            String(
              row[
                cangIndex
              ] || ''
            ).trim()
          )
          .filter(Boolean)
      )
    ];


  return {

    ok: true,

    rows:
      rows

  };

}

/**
 * ==================================================
 * LỊCH SỬ ĐẶT HÀNG
 * ==================================================
 *
 * Sheet DonDatHang:
 * 1 đơn có thể có nhiều dòng hàng hóa.
 *
 * Gom theo:
 * maDonHangDat
 *
 * Filter:
 * - từ ngày
 * - đến ngày
 * - tên nguyên liệu
 * ==================================================
 */
function getLichSuDonDatHang(
  filters
) {

  filters =
    filters || {};


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      'DonDatHang'
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet DonDatHang.'
    );

  }


  if (
    sheet.getLastRow() < 2
  ) {

    return {

      ok: true,

      orders: [],

      materials: []

    };

  }


  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0]
      .map(v =>
        String(
          v || ''
        ).trim()
      );


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        lastColumn
      )
      .getValues();


  const index = {};


  headers.forEach(
    (
      header,
      i
    ) => {

      index[header] =
        i;

    }
  );


  const get =
    (
      row,
      key
    ) => {

      const i =
        index[key];


      if (
        i === undefined
      ) {

        return '';

      }


      return row[i];

    };


  /*
   * ==========================================
   * FILTER
   * ==========================================
   */

  const fromDate =
    parsePoDateInput_(
      filters.fromDate
    );


  const toDate =
    parsePoDateInput_(
      filters.toDate
    );


  /*
   * Đến ngày tính hết ngày đó.
   */
  if (toDate) {

    toDate.setHours(
      23,
      59,
      59,
      999
    );

  }


  const materialFilter =
    String(
      filters.material ||
      ''
    ).trim();


  /*
   * ==========================================
   * DANH SÁCH NGUYÊN LIỆU
   * ==========================================
   */

  const materialSet =
    new Set();


  values.forEach(row => {

    const fullName =
      String(
        get(
          row,
          'tieuDeTenHangHoa'
        ) || ''
      ).trim();


    const materialName =
      getFirstLinePo_(
        fullName
      );


    if (materialName) {

      materialSet.add(
        materialName
      );

    }

  });


  /*
   * ==========================================
   * GOM ĐƠN
   * ==========================================
   */

  const map = {};


  values.forEach(row => {

    const maDonHangDat =
      String(
        get(
          row,
          'maDonHangDat'
        ) || ''
      ).trim();


    if (!maDonHangDat) {
      return;
    }


    const ngayRaw =
      get(
        row,
        'tieuDeNgay'
      );


    const ngayDon =
      normalizePoDate_(
        ngayRaw
      );


    /*
     * Lọc ngày.
     */
    if (
      fromDate &&
      ngayDon &&
      ngayDon < fromDate
    ) {
      return;
    }


    if (
      toDate &&
      ngayDon &&
      ngayDon > toDate
    ) {
      return;
    }


    const tenHangHoa =
      String(
        get(
          row,
          'tieuDeTenHangHoa'
        ) || ''
      );


    const tenNguyenLieu =
      getFirstLinePo_(
        tenHangHoa
      );


    /*
     * Lọc nguyên liệu.
     */
    if (
      materialFilter &&
      tenNguyenLieu !==
        materialFilter
    ) {

      return;

    }


    if (!map[maDonHangDat]) {

      const donGiaGomThue =
        get(
          row,
          'tieuDeDonGiaGomThue'
        );


      const donGiaChuaThue =
        get(
          row,
          'tieuDeDonGiaChuaGomThue'
        );


      map[maDonHangDat] = {

        maDonHangDat:
          maDonHangDat,

        tieuDeNgay:
          formatPoDateVN_(
            ngayDon
          ),

        tieuDeSoDonDatHang:
          String(
            get(
              row,
              'tieuDeSoDonDatHang'
            ) || ''
          ),

        tieuDeTrang:
          String(
            get(
              row,
              'tieuDeTrang'
            ) || '1/1'
          ),

        benMua:
          String(
            get(
              row,
              'benMua'
            ) || ''
          ),

        tieuDeNhaSanXuat:
          String(
            get(
              row,
              'tieuDeNhaSanXuat'
            ) || ''
          ),

        tieuDeDonViVanChuyenChoNCC:
          String(
            get(
              row,
              'tieuDeDonViVanChuyenChoNCC'
            ) || ''
          ),

        tieuDeTheoDeNghi:
          String(
            get(
              row,
              'tieuDeTheoDeNghi'
            ) || ''
          ),

        tieuDeNoiDung:
          String(
            get(
              row,
              'tieuDeNoiDung'
            ) || ''
          ),

        tieuDeNguoiLienHe:
          String(
            get(
              row,
              'tieuDeNguoiLienHe'
            ) || ''
          ),

        tieuDePhuongThucThanhToan:
          String(
            get(
              row,
              'tieuDePhuongThucThanhToan'
            ) || ''
          ),

        tieuDeThoiGianGiaoHang:
          formatPoDateVN_(
            normalizePoDate_(
              get(
                row,
                'tieuDeThoiGianGiaoHang'
              )
            )
          )
          ||
          String(
            get(
              row,
              'tieuDeThoiGianGiaoHang'
            ) || ''
          ),

        tieuDeCangDen:
          String(
            get(
              row,
              'tieuDeCangDen'
            ) || ''
          ),

        tieuDeTongCong:
          Number(
            get(
              row,
              'tieuDeTongCong'
            ) || 0
          ),

        thoiGianTao:
          String(
            get(
              row,
              'thoiGianTao'
            ) || ''
          ),

        /*
        * ==========================================
        * TRẠNG THÁI / ẢNH PO
        * ==========================================
        */

        trangThaiPO:
          String(
            get(
              row,
              'trangThaiPO'
            ) ||
            'Đã tạo'
          ),

        anhPO:
          String(
            get(
              row,
              'anhPO'
            ) ||
            ''
          ),

        loaiDonGia:
          donGiaGomThue !== '' &&
          donGiaGomThue !== null
            ? 'coThue'
            : 'khongThue',

        items: []

      };

    }


    const donGia =

      map[
        maDonHangDat
      ].loaiDonGia ===
        'coThue'

        ? Number(
            get(
              row,
              'tieuDeDonGiaGomThue'
            ) || 0
          )

        : Number(
            get(
              row,
              'tieuDeDonGiaChuaGomThue'
            ) || 0
          );


    map[
      maDonHangDat
    ].items.push({

      stt:
        Number(
          get(
            row,
            'tieuDeStt'
          ) || 0
        ),

      maHangHoa:
        String(
          get(
            row,
            'tieuDeMaHangHoa'
          ) || ''
        ),

      tenHangHoa:
        tenHangHoa,

      tenNguyenLieu:
        tenNguyenLieu,

      donViTinh:
        String(
          get(
            row,
            'tieuDeDonViTinh'
          ) || ''
        ),

      soLuong:
        Number(
          get(
            row,
            'tieuDeSoLuong'
          ) || 0
        ),

      donGia:
        donGia,

      thanhTien:
        Number(
          get(
            row,
            'tieuDeThanhTien'
          ) || 0
        ),

      thongSoKyThuat:
        String(
          get(
            row,
            'tieuDeThongSoKyThuat'
          ) || ''
        )

    });

  });


  const orders =
    Object
      .values(
        map
      )
      .sort(
        (
          a,
          b
        ) => {

          return String(
            b.thoiGianTao || ''
          ).localeCompare(
            String(
              a.thoiGianTao || ''
            )
          );

        }
      );


  return {

    ok: true,

    orders:
      orders,

    materials:
      [
        ...materialSet
      ]
        .sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              'vi'
            )
        )

  };

}

function getFirstLinePo_(
  value
) {

  return String(
    value || ''
  )
    .split(
      /\r?\n/
    )[0]
    .trim();

}


function normalizePoDate_(
  value
) {

  if (!value) {
    return null;
  }


  if (
    Object.prototype
      .toString
      .call(
        value
      ) ===
      '[object Date]'
  ) {

    return value;

  }


  return parsePoDateInput_(
    value
  );

}


function formatPoDateVN_(
  date
) {

  if (!date) {
    return '';
  }


  return Utilities
    .formatDate(
      date,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy'
    );

}

/**
 * ==================================================
 * CẬP NHẬT ĐƠN ĐẶT HÀNG
 * ==================================================
 *
 * - Giữ nguyên maDonHangDat
 * - Giữ nguyên số đơn
 * - Xóa các dòng cũ của đơn
 * - ghi lại các dòng mới
 * ==================================================
 */
function updateDonDatHangCardData(
  maDonHangDat,
  payload
) {

  maDonHangDat =
    String(
      maDonHangDat || ''
    ).trim();


  if (!maDonHangDat) {

    throw new Error(
      'Thiếu maDonHangDat.'
    );

  }


  payload =
    payload || {};


  const items =
    Array.isArray(
      payload.items
    )
      ? payload.items
      : [];


  if (!items.length) {

    throw new Error(
      'Đơn đặt hàng chưa có hàng hóa.'
    );

  }


  const lock =
    LockService
      .getScriptLock();


  lock.waitLock(
    30000
  );


  try {

    const ss =
      SpreadsheetApp
        .getActiveSpreadsheet();


    const sheet =
      ss.getSheetByName(
        'DonDatHang'
      );


    if (!sheet) {

      throw new Error(
        'Không tìm thấy sheet DonDatHang.'
      );

    }


    const lastColumn =
      sheet.getLastColumn();


    const headers =
      sheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0]
        .map(v =>
          String(
            v || ''
          ).trim()
        );


    const maIndex =
      headers.indexOf(
        'maDonHangDat'
      );


    if (
      maIndex < 0
    ) {

      throw new Error(
        'DonDatHang chưa có cột maDonHangDat.'
      );

    }


    /*
     * ========================================
     * LẤY THỜI GIAN TẠO CŨ
     * ========================================
     */

    let oldCreateTime = '';


    let oldPoNumber =
      String(
        payload.soDonDatHang ||
        ''
      );

    /*
    * Giữ trạng thái và ảnh PO cũ
    * khi chỉnh sửa đơn.
    */
    let oldTrangThaiPO =
      'Đã tạo';

    let oldAnhPO =
      '';


    if (
      sheet.getLastRow() >= 2
    ) {

      const rows =
        sheet
          .getRange(
            2,
            1,
            sheet.getLastRow() - 1,
            lastColumn
          )
          .getValues();


      const createIndex =
        headers.indexOf(
          'thoiGianTao'
        );


      const poIndex =
        headers.indexOf(
          'tieuDeSoDonDatHang'
        );

      const statusIndex =
        headers.indexOf(
          'trangThaiPO'
        );


      const imageIndex =
        headers.indexOf(
          'anhPO'
        );


      for (
        let i = 0;
        i < rows.length;
        i++
      ) {

        if (
          String(
            rows[i][maIndex] ||
            ''
          ).trim() ===
            maDonHangDat
        ) {

          if (
            createIndex >= 0
          ) {

            oldCreateTime =
              rows[i][
                createIndex
              ] ||
              '';

          }


          if (
            poIndex >= 0
          ) {

            oldPoNumber =
              String(
                rows[i][
                  poIndex
                ] ||
                oldPoNumber
              );

          }

          if (
            statusIndex >= 0
          ) {

            oldTrangThaiPO =
              String(
                rows[i][
                  statusIndex
                ] ||
                'Đã tạo'
              ).trim();

          }


          if (
            imageIndex >= 0
          ) {

            oldAnhPO =
              String(
                rows[i][
                  imageIndex
                ] ||
                ''
              ).trim();

          }


          break;

        }

      }


      /*
       * ========================================
       * XÓA CÁC DÒNG CŨ
       * ========================================
       *
       * Xóa từ dưới lên.
       */

      for (
        let i =
          rows.length - 1;
        i >= 0;
        i--
      ) {

        if (
          String(
            rows[i][maIndex] ||
            ''
          ).trim() ===
            maDonHangDat
        ) {

          sheet.deleteRow(
            i + 2
          );

        }

      }

    }


    const config =
      getCauHinhDonDatHang()
        .config ||
      {};


    const tongCong =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.thanhTien ||
            0
          ),
        0
      );


    const loaiDonGia =
      String(
        payload.loaiDonGia ||
        'coThue'
      );


    const commonRecord = {

      tieuDeCongTy:
        config.tieuDeCongTy ||
        '',

      tenCongTyPhanChuKy:
        config.tenCongTyPhanChuKy ||
        '',

      tieuDeDonDatHang:
        config.tieuDeDonDatHang ||
        '',


      tieuDeNgay:
        parsePoDateInput_(
          payload.ngay
        )
        ||
        new Date(),


      /*
       * GIỮ NGUYÊN SỐ PO CŨ.
       */
      tieuDeSoDonDatHang:
        oldPoNumber,


      tieuDeTrang:
        payload.trang ||
        '1/1',


      benMua:
        payload.benMua ||
        '',

      tieuDeNhaSanXuat:
        payload.nhaSanXuat ||
        '',

      tieuDeDonViVanChuyenChoNCC:
        payload.donViVanChuyen ||
        '',

      tieuDeTheoDeNghi:
        payload.theoDeNghi ||
        '',

      tieuDeNoiDung:
        payload.noiDung ||
        '',

      tieuDeNguoiLienHe:
        payload.nguoiLienHe ||
        '',

      tieuDePhuongThucThanhToan:
        payload.phuongThucThanhToan ||
        '',

      tieuDeThoiGianGiaoHang:
        parsePoDateInput_(
          payload.thoiGianGiaoHang
        )
        ||
        payload.thoiGianGiaoHang ||
        '',

      tieuDeCangDen:
        payload.cangDen ||
        '',

      tieuDeTongCong:
        tongCong,

      maDonHangDat:
        maDonHangDat,

      /*
       * Giữ thời gian tạo cũ.
       */
      thoiGianTao:
        oldCreateTime ||
        Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          'dd/MM/yyyy HH:mm:ss'
        ),


      /*
      * Không reset trạng thái khi sửa đơn.
      */
      trangThaiPO:
        oldTrangThaiPO ||
        'Đã tạo',

      anhPO:
        oldAnhPO ||
        ''

    };


    const records =
      items.map(
        (
          item,
          index
        ) => {

          const record = {

            ...commonRecord,

            tieuDeStt:
              index + 1,

            tieuDeMaHangHoa:
              item.maHangHoa ||
              '',

            tieuDeTenHangHoa:
              item.tenHangHoa ||
              '',

            tieuDeDonViTinh:
              item.donViTinh ||
              '',

            tieuDeSoLuong:
              Number(
                item.soLuong ||
                0
              ),

            tieuDeThanhTien:
              Number(
                item.thanhTien ||
                0
              ),

            tieuDeThongSoKyThuat:
              item.thongSoKyThuat ||
              ''

          };


          if (
            loaiDonGia ===
            'coThue'
          ) {

            record
              .tieuDeDonGiaGomThue =
                Number(
                  item.donGia ||
                  0
                );

            record
              .tieuDeDonGiaChuaGomThue =
                '';

          } else {

            record
              .tieuDeDonGiaGomThue =
                '';

            record
              .tieuDeDonGiaChuaGomThue =
                Number(
                  item.donGia ||
                  0
                );

          }


          return record;

        }
      );


    const values =
      records.map(
        record =>
          headers.map(
            header =>
              Object.prototype
                .hasOwnProperty
                .call(
                  record,
                  header
                )
                ? record[
                    header
                  ]
                : ''
          )
      );


    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        values.length,
        headers.length
      )
      .setValues(
        values
      );


    SpreadsheetApp.flush();


    return {

      ok: true,

      maDonHangDat:
        maDonHangDat,

      soDonDatHang:
        oldPoNumber,

      soDongDaLuu:
        values.length

    };


  } finally {

    lock.releaseLock();

  }

}

/**
 * ==================================================
 * UPLOAD ẢNH PO ĐÃ KÝ
 * ==================================================
 *
 * fileData:
 * {
 *   name,
 *   mimeType,
 *   base64
 * }
 *
 * Sau upload:
 * - trangThaiPO = Đã ký duyệt
 * - anhPO = link Drive
 *
 * Cập nhật TẤT CẢ dòng cùng maDonHangDat.
 * ==================================================
 */
function uploadAnhPODonDatHang(
  maDonHangDat,
  fileData
) {

  maDonHangDat =
    String(
      maDonHangDat ||
      ''
    ).trim();


  if (!maDonHangDat) {

    throw new Error(
      'Thiếu mã đơn hàng.'
    );

  }


  if (
    !fileData ||
    !fileData.base64
  ) {

    throw new Error(
      'Chưa có file ảnh PO.'
    );

  }


  /*
   * ==========================================
   * 1. LẤY FOLDER ID
   * ==========================================
   */

  const folderId =
    getDriveFolderIdFromPoLink_(
      Image_PO_Link
    );


  if (!folderId) {

    throw new Error(
      'Chưa cấu hình Image_PO_Link.'
    );

  }


  const folder =
    DriveApp.getFolderById(
      folderId
    );


  /*
   * ==========================================
   * 2. DECODE FILE
   * ==========================================
   */

  const bytes =
    Utilities.base64Decode(
      String(
        fileData.base64
      )
    );


  const originalName =
    String(
      fileData.name ||
      'PO.jpg'
    )
      .trim();


  const extension =
    getPoFileExtension_(
      originalName
    );


  const safePoId =
    maDonHangDat
      .replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );


  const fileName =
    'PO_' +
    safePoId +
    '_' +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyyMMdd_HHmmss'
    )
    +
    (
      extension
        ? '.' + extension
        : ''
    );


  const blob =
    Utilities.newBlob(
      bytes,
      String(
        fileData.mimeType ||
        'image/jpeg'
      ),
      fileName
    );


  /*
   * ==========================================
   * 3. TẠO FILE DRIVE
   * ==========================================
   */

  const file =
    folder.createFile(
      blob
    );


  /*
   * Không tự public file.
   *
   * Quyền truy cập sẽ theo folder Drive
   * mà bạn cấu hình.
   */
  const fileUrl =
    file.getUrl();


  /*
   * ==========================================
   * 4. CẬP NHẬT SHEET
   * ==========================================
   */

  /*
  * ==========================================
  * 4. CẬP NHẬT PO → ĐÃ KÝ DUYỆT
  * ==========================================
  */

  updateTrangThaiAnhPODonDatHang_(
    maDonHangDat,
    'Đã ký duyệt',
    fileUrl
  );


  /*
  * ==========================================
  * 5. TỰ ĐỘNG TẠO KẾ HOẠCH HÀNG VỀ
  * ==========================================
  *
  * Chỉ chạy sau khi PO đã chuyển
  * thành "Đã ký duyệt".
  *
  * Hàm bên trong có chống trùng:
  * maDonHang + MaKeToan.
  */

  const keHoachHangVeResult =
    dongBoKeHoachHangVeTuPO_(
      maDonHangDat
    );


  /*
  * ==========================================
  * 6. RETURN
  * ==========================================
  */

  return {

    ok: true,

    maDonHangDat:
      maDonHangDat,

    trangThaiPO:
      'Đã ký duyệt',

    anhPO:
      fileUrl,

    fileId:
      file.getId(),

    fileName:
      fileName,


    /*
    * Trả thông tin đồng bộ
    * cho frontend.
    */
    keHoachHangVe:
      keHoachHangVeResult

  };

}


/**
 * Cập nhật toàn bộ dòng cùng một PO.
 */
function updateTrangThaiAnhPODonDatHang_(
  maDonHangDat,
  trangThaiPO,
  anhPO
) {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      'DonDatHang'
    );


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet DonDatHang.'
    );

  }


  if (
    sheet.getLastRow() < 2
  ) {

    throw new Error(
      'Sheet DonDatHang chưa có dữ liệu.'
    );

  }


  const lastColumn =
    sheet.getLastColumn();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0]
      .map(item =>
        String(
          item ||
          ''
        ).trim()
      );


  const maIndex =
    headers.indexOf(
      'maDonHangDat'
    );


  const statusIndex =
    headers.indexOf(
      'trangThaiPO'
    );


  const imageIndex =
    headers.indexOf(
      'anhPO'
    );


  if (
    maIndex < 0
  ) {

    throw new Error(
      'DonDatHang thiếu cột maDonHangDat.'
    );

  }


  if (
    statusIndex < 0
  ) {

    throw new Error(
      'DonDatHang thiếu cột trangThaiPO.'
    );

  }


  if (
    imageIndex < 0
  ) {

    throw new Error(
      'DonDatHang thiếu cột anhPO.'
    );

  }


  const numRows =
    sheet.getLastRow() - 1;


  const values =
    sheet
      .getRange(
        2,
        1,
        numRows,
        lastColumn
      )
      .getValues();


  let updatedCount =
    0;


  values.forEach(
    (
      row,
      index
    ) => {

      if (
        String(
          row[
            maIndex
          ] ||
          ''
        ).trim() !==
        maDonHangDat
      ) {

        return;

      }


      /*
       * Row sheet thực tế:
       * dữ liệu array index 0 = row 2.
       */
      const sheetRow =
        index + 2;


      sheet
        .getRange(
          sheetRow,
          statusIndex + 1
        )
        .setValue(
          trangThaiPO
        );


      sheet
        .getRange(
          sheetRow,
          imageIndex + 1
        )
        .setValue(
          anhPO
        );


      updatedCount++;

    }
  );


  if (!updatedCount) {

    throw new Error(
      'Không tìm thấy đơn ' +
      maDonHangDat +
      '.'
    );

  }


  SpreadsheetApp.flush();


  return updatedCount;

}


/**
 * Image_PO_Link có thể là:
 *
 * 1Abc123...
 *
 * hoặc:
 *
 * https://drive.google.com/drive/folders/1Abc123...
 */
function getDriveFolderIdFromPoLink_(
  value
) {

  const text =
    String(
      value ||
      ''
    ).trim();


  if (!text) {
    return '';
  }


  /*
   * Nếu nhập thẳng ID.
   */
  if (
    !text.includes(
      '/'
    )
  ) {

    return text;

  }


  /*
   * Link:
   * .../folders/FOLDER_ID
   */
  const match =
    text.match(
      /\/folders\/([^/?#]+)/
    );


  if (
    match &&
    match[1]
  ) {

    return match[1];

  }


  return '';

}


function getPoFileExtension_(
  fileName
) {

  const text =
    String(
      fileName ||
      ''
    );


  const match =
    text.match(
      /\.([a-zA-Z0-9]+)$/
    );


  return match
    ? match[1]
    : '';

}

function testDrivePermission() {

  const folderId =
    getDriveFolderIdFromPoLink_(
      Image_PO_Link
    );

  const folder =
    DriveApp.getFolderById(
      folderId
    );

  Logger.log(
    folder.getName()
  );

}

/**
 * ==================================================
 * ĐỒNG BỘ PO ĐÃ KÝ DUYỆT
 * → KẾ HOẠCH HÀNG VỀ
 * ==================================================
 *
 * Một dòng DonDatHang
 * = một dòng nguyên liệu
 * = một dòng KeHoachHangVe.
 *
 * Chống trùng:
 * maDonHang + MaKeToan
 *
 * maDonHang:
 * DonDatHang.tieuDeSoDonDatHang
 *
 * MaKeToan:
 * DonDatHang.tieuDeMaHangHoa
 * ==================================================
 */
function dongBoKeHoachHangVeTuPO_(
  maDonHangDat
) {

  maDonHangDat =
    String(
      maDonHangDat ||
      ''
    ).trim();


  if (!maDonHangDat) {

    throw new Error(
      'Thiếu maDonHangDat khi đồng bộ kế hoạch hàng về.'
    );

  }


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  /*
   * ==========================================
   * 1. KIỂM TRA CÁC SHEET
   * ==========================================
   */

  const poSheet =
    ss.getSheetByName(
      'DonDatHang'
    );


  const materialSheet =
    ss.getSheetByName(
      'NguyenLieuVatTu'
    );


  const stockSheet =
    ss.getSheetByName(
      'TonKho'
    );


  const incomingSheet =
    ss.getSheetByName(
      'KeHoachHangVe'
    );


  if (!poSheet) {

    throw new Error(
      'Không tìm thấy sheet DonDatHang.'
    );

  }


  if (!materialSheet) {

    throw new Error(
      'Không tìm thấy sheet NguyenLieuVatTu.'
    );

  }


  if (!stockSheet) {

    throw new Error(
      'Không tìm thấy sheet TonKho.'
    );

  }


  if (!incomingSheet) {

    throw new Error(
      'Không tìm thấy sheet KeHoachHangVe.'
    );

  }


  /*
   * ==========================================
   * 2. ĐỌC DON DẶT HÀNG
   * ==========================================
   */

  if (
    poSheet.getLastRow() < 2
  ) {

    throw new Error(
      'Sheet DonDatHang chưa có dữ liệu.'
    );

  }


  const poLastColumn =
    poSheet.getLastColumn();


  const poHeaders =
    poSheet
      .getRange(
        1,
        1,
        1,
        poLastColumn
      )
      .getValues()[0]
      .map(item =>
        String(
          item ||
          ''
        ).trim()
      );


  const poIndex =
    makePoHeaderIndex_(
      poHeaders
    );


  const requiredPoHeaders = [
    'maDonHangDat',
    'tieuDeSoDonDatHang',
    'tieuDeMaHangHoa',
    'tieuDeSoLuong',
    'tieuDeDonViTinh',
    'thoiGianTao',
    'trangThaiPO'
  ];


  requiredPoHeaders
    .forEach(header => {

      if (
        poIndex[header] ===
        undefined
      ) {

        throw new Error(
          'DonDatHang thiếu cột ' +
          header +
          '.'
        );

      }

    });


  const poValues =
    poSheet
      .getRange(
        2,
        1,
        poSheet.getLastRow() - 1,
        poLastColumn
      )
      .getValues();


  /*
   * Chỉ lấy các dòng của đúng PO.
   */
  const poRows =
    poValues
      .filter(row =>
        String(
          row[
            poIndex.maDonHangDat
          ] ||
          ''
        ).trim() ===
        maDonHangDat
      );


  if (!poRows.length) {

    throw new Error(
      'Không tìm thấy dữ liệu PO: ' +
      maDonHangDat
    );

  }


  /*
   * ==========================================
   * 3. PO PHẢI Ở TRẠNG THÁI ĐÃ KÝ DUYỆT
   * ==========================================
   */

  const trangThaiPO =
    String(
      poRows[0][
        poIndex.trangThaiPO
      ] ||
      ''
    ).trim();


  if (
    trangThaiPO !==
    'Đã ký duyệt'
  ) {

    throw new Error(
      'PO chưa ở trạng thái "Đã ký duyệt", không tạo kế hoạch hàng về.'
    );

  }


  /*
   * ==========================================
   * 4. ĐỌC NGUYÊN LIỆU VẬT TƯ
   * ==========================================
   */

  const materialValues =
    materialSheet
      .getDataRange()
      .getValues();


  if (
    materialValues.length < 2
  ) {

    throw new Error(
      'Sheet NguyenLieuVatTu chưa có dữ liệu.'
    );

  }


  const materialHeaders =
    materialValues[0]
      .map(item =>
        String(
          item ||
          ''
        ).trim()
      );


  const materialIndex =
    makePoHeaderIndex_(
      materialHeaders
    );


  [
    'MaKeToan',
    'maNguyenLieu',
    'tenNguyenLieu',
    'loaiNguyenLieu'
  ]
    .forEach(header => {

      if (
        materialIndex[
          header
        ] === undefined
      ) {

        throw new Error(
          'NguyenLieuVatTu thiếu cột ' +
          header +
          '.'
        );

      }

    });


  /*
   * Map:
   * MaKeToan → thông tin nguyên liệu.
   */
  const materialMap =
    {};


  materialValues
    .slice(1)
    .forEach(row => {

      const accountingCode =
        String(
          row[
            materialIndex.MaKeToan
          ] ||
          ''
        ).trim();


      if (!accountingCode) {
        return;
      }


      if (
        !materialMap[
          accountingCode
        ]
      ) {

        materialMap[
          accountingCode
        ] = {

          maNguyenLieu:
            String(
              row[
                materialIndex.maNguyenLieu
              ] ||
              ''
            ).trim(),

          MaKeToan:
            accountingCode,

          tenNguyenLieu:
            String(
              row[
                materialIndex.tenNguyenLieu
              ] ||
              ''
            ).trim(),

          loaiNguyenLieu:
            String(
              row[
                materialIndex.loaiNguyenLieu
              ] ||
              ''
            ).trim()

        };

      }

    });


  /*
   * ==========================================
   * 5. ĐỌC TON KHO
   * ==========================================
   *
   * Dùng để lấy soNgayVeKho.
   *
   * TonKho có thể có nhiều Lot
   * của cùng nguyên liệu.
   *
   * Chỉ lấy giá trị soNgayVeKho hợp lệ
   * đầu tiên của nguyên liệu.
   * ==========================================
   */

  const stockValues =
    stockSheet
      .getDataRange()
      .getValues();


  if (
    stockValues.length < 2
  ) {

    throw new Error(
      'Sheet TonKho chưa có dữ liệu.'
    );

  }


  const stockHeaders =
    stockValues[0]
      .map(item =>
        String(
          item ||
          ''
        ).trim()
      );


  const stockIndex =
    makePoHeaderIndex_(
      stockHeaders
    );


  [
    'maNguyenLieu',
    'MaKeToan',
    'soNgayVeKho'
  ]
    .forEach(header => {

      if (
        stockIndex[
          header
        ] === undefined
      ) {

        throw new Error(
          'TonKho thiếu cột ' +
          header +
          '.'
        );

      }

    });


  const leadtimeByMaterial =
    {};


  const leadtimeByAccounting =
    {};


  stockValues
    .slice(1)
    .forEach(row => {

      const maNguyenLieu =
        String(
          row[
            stockIndex.maNguyenLieu
          ] ||
          ''
        ).trim();


      const MaKeToan =
        String(
          row[
            stockIndex.MaKeToan
          ] ||
          ''
        ).trim();


      const rawLeadtime =
        row[
          stockIndex.soNgayVeKho
        ];


      /*
       * Dòng trống thì bỏ.
       *
       * 0 vẫn được coi là giá trị hợp lệ.
       */
      if (
        rawLeadtime === '' ||
        rawLeadtime === null ||
        rawLeadtime === undefined
      ) {

        return;

      }


      const soNgayVeKho =
        Number(
          rawLeadtime
        );


      if (
        !Number.isFinite(
          soNgayVeKho
        )
      ) {

        return;

      }


      if (
        maNguyenLieu &&
        leadtimeByMaterial[
          maNguyenLieu
        ] === undefined
      ) {

        leadtimeByMaterial[
          maNguyenLieu
        ] =
          soNgayVeKho;

      }


      if (
        MaKeToan &&
        leadtimeByAccounting[
          MaKeToan
        ] === undefined
      ) {

        leadtimeByAccounting[
          MaKeToan
        ] =
          soNgayVeKho;

      }

    });


  /*
   * ==========================================
   * 6. HEADER KẾ HOẠCH HÀNG VỀ
   * ==========================================
   */

  const incomingLastColumn =
    incomingSheet.getLastColumn();


  if (
    incomingLastColumn < 1
  ) {

    throw new Error(
      'KeHoachHangVe chưa có dòng tiêu đề.'
    );

  }


  const incomingHeaders =
    incomingSheet
      .getRange(
        1,
        1,
        1,
        incomingLastColumn
      )
      .getValues()[0]
      .map(item =>
        String(
          item ||
          ''
        ).trim()
      );


  const requiredIncomingHeaders = [

    'idHangVe',

    'maNguyenLieu',

    'MaKeToan',

    'tenNguyenLieu',

    'loaiNguyenLieu',

    'soLuongVeDuKien',

    'donVi',

    'ngayDuKienVe',

    'nhaCungCap',

    'maDonHang',

    'trangThai',

    'ghiChu',

    'ngayYeuCauMuaHang',

    'soYeuCauMuaHang',

    'ngayVe',

    'ngayDuKienGiaoHangTaiXuong',

    'NgayDongCong',

    'ngayHangVeDuKien',

    'ngayPO',

    'nguoiTao'

  ];


  requiredIncomingHeaders
    .forEach(header => {

      if (
        !incomingHeaders.includes(
          header
        )
      ) {

        throw new Error(
          'KeHoachHangVe thiếu cột ' +
          header +
          '.'
        );

      }

    });


  /*
   * ==========================================
   * 7. DANH SÁCH ĐÃ CÓ
   *
   * Khóa chống trùng:
   *
   * maDonHang + MaKeToan
   * ==========================================
   */

  const existingKeySet =
    new Set();


  if (
    incomingSheet.getLastRow() >= 2
  ) {

    const incomingValues =
      incomingSheet
        .getRange(
          2,
          1,
          incomingSheet.getLastRow() - 1,
          incomingLastColumn
        )
        .getValues();


    const incomingIndex =
      makePoHeaderIndex_(
        incomingHeaders
      );


    incomingValues
      .forEach(row => {

        const maDonHang =
          String(
            row[
              incomingIndex.maDonHang
            ] ||
            ''
          ).trim();


        const MaKeToan =
          String(
            row[
              incomingIndex.MaKeToan
            ] ||
            ''
          ).trim();


        if (
          !maDonHang ||
          !MaKeToan
        ) {
          return;
        }


        existingKeySet.add(
          makePoIncomingKey_(
            maDonHang,
            MaKeToan
          )
        );

      });

  }


  /*
   * ==========================================
   * 8. NGƯỜI TẠO
   * ==========================================
   */

  const nguoiTao =
    getPoCurrentUser_();


  /*
   * ==========================================
   * 9. VALIDATE + TẠO RECORD
   * ==========================================
   */

  const records = [];

  let skippedCount =
    0;


  poRows.forEach(row => {

    /*
     * MaKeToan của PO.
     */
    const MaKeToan =
      String(
        row[
          poIndex.tieuDeMaHangHoa
        ] ||
        ''
      ).trim();


    if (!MaKeToan) {

      throw new Error(
        'PO có dòng chưa có tieuDeMaHangHoa.'
      );

    }


    /*
     * Tìm nguyên liệu.
     */
    const material =
      materialMap[
        MaKeToan
      ];


    if (!material) {

      throw new Error(
        'Không map được MaKeToan "' +
        MaKeToan +
        '" từ DonDatHang sang NguyenLieuVatTu.'
      );

    }


    /*
     * Tìm leadtime.
     *
     * Ưu tiên maNguyenLieu,
     * fallback MaKeToan.
     */
    let soNgayVeKho =
      leadtimeByMaterial[
        material.maNguyenLieu
      ];


    if (
      soNgayVeKho === undefined
    ) {

      soNgayVeKho =
        leadtimeByAccounting[
          MaKeToan
        ];

    }


    if (
      soNgayVeKho === undefined
    ) {

      throw new Error(
        'Không tìm thấy soNgayVeKho trong TonKho cho nguyên liệu "' +
        material.tenNguyenLieu +
        '" (' +
        MaKeToan +
        ').'
      );

    }


    /*
     * Số PO.
     */
    const maDonHang =
      String(
        row[
          poIndex.tieuDeSoDonDatHang
        ] ||
        ''
      ).trim();


    if (!maDonHang) {

      throw new Error(
        'PO chưa có tieuDeSoDonDatHang.'
      );

    }


    /*
     * ======================================
     * CHỐNG TRÙNG
     * ======================================
     */

    const uniqueKey =
      makePoIncomingKey_(
        maDonHang,
        MaKeToan
      );


    if (
      existingKeySet.has(
        uniqueKey
      )
    ) {

      skippedCount++;

      return;

    }


    /*
     * ======================================
     * THỜI GIAN TẠO PO
     * ======================================
     */

    const thoiGianTao =
      parsePoDateTime_(
        row[
          poIndex.thoiGianTao
        ]
      );


    if (!thoiGianTao) {

      throw new Error(
        'Không đọc được thoiGianTao của PO ' +
        maDonHang +
        '.'
      );

    }


    /*
     * ======================================
     * NGÀY DỰ KIẾN VỀ
     *
     * thoiGianTao
     * +
     * soNgayVeKho
     * ======================================
     */

    const ngayDuKienVe =
      addPoDays_(
        thoiGianTao,
        soNgayVeKho
      );


    const record = {

      /*
       * Bạn yêu cầu không dùng.
       */
      idHangVe:
        '',


      /*
       * Map NguyenLieuVatTu.
       */
      maNguyenLieu:
        material.maNguyenLieu ||
        '',

      MaKeToan:
        MaKeToan,

      tenNguyenLieu:
        material.tenNguyenLieu ||
        '',

      loaiNguyenLieu:
        material.loaiNguyenLieu ||
        '',


      /*
       * Lấy từ dòng PO.
       */
      soLuongVeDuKien:
        Number(
          row[
            poIndex.tieuDeSoLuong
          ] ||
          0
        ),

      donVi:
        String(
          row[
            poIndex.tieuDeDonViTinh
          ] ||
          ''
        ).trim(),


      /*
       * Ngày hàng về.
       */
      ngayDuKienVe:
        ngayDuKienVe,


      /*
       * Bạn yêu cầu để trống.
       */
      nhaCungCap:
        '',


      /*
       * Số đơn PO.
       */
      maDonHang:
        maDonHang,


      /*
       * Theo yêu cầu hiện tại.
       */
      trangThai:
        'Dang Ve',


      ghiChu:
        '',

      ngayYeuCauMuaHang:
        '',

      soYeuCauMuaHang:
        '',


      /*
       * ngayVe = ngayDuKienVe
       */
      ngayVe:
        ngayDuKienVe,


      /*
       * Các trường chưa sử dụng.
       */
      ngayDuKienGiaoHangTaiXuong:
        '',

      NgayDongCong:
        '',

      ngayHangVeDuKien:
        '',

      ngayPO:
        '',


      /*
       * Người thực hiện ký duyệt/upload.
       */
      nguoiTao:
        nguoiTao

    };


    records.push(
      record
    );


    /*
     * Thêm ngay vào Set
     * để chống trùng ngay trong chính PO.
     */
    existingKeySet.add(
      uniqueKey
    );

  });


  /*
   * ==========================================
   * 10. KHÔNG CÓ DÒNG MỚI
   * ==========================================
   */

  if (!records.length) {

    return {

      ok: true,

      added:
        0,

      skipped:
        skippedCount,

      message:
        'Không tạo thêm dòng mới vì dữ liệu PO đã có trong KeHoachHangVe.'

    };

  }


  /*
   * ==========================================
   * 11. MAP RECORD THEO HEADER THỰC TẾ
   * ==========================================
   */

  const valuesToWrite =
    records.map(
      record =>
        incomingHeaders
          .map(header =>
            Object.prototype
              .hasOwnProperty
              .call(
                record,
                header
              )
              ? record[
                  header
                ]
              : ''
          )
    );


  /*
   * ==========================================
   * 12. GHI SHEET MỘT LẦN
   * ==========================================
   */

  incomingSheet
    .getRange(
      incomingSheet.getLastRow() + 1,
      1,
      valuesToWrite.length,
      incomingHeaders.length
    )
    .setValues(
      valuesToWrite
    );


  SpreadsheetApp.flush();


  return {

    ok: true,

    added:
      records.length,

    skipped:
      skippedCount,

    message:
      'Đã thêm ' +
      records.length +
      ' dòng vào KeHoachHangVe.'
      +
      (
        skippedCount
          ? (
              ' Bỏ qua ' +
              skippedCount +
              ' dòng đã tồn tại.'
            )
          : ''
      )

  };

}

/**
 * Tạo index header.
 */
function makePoHeaderIndex_(
  headers
) {

  const index = {};


  (
    headers ||
    []
  )
    .forEach(
      (
        header,
        i
      ) => {

        const key =
          String(
            header ||
            ''
          ).trim();


        if (key) {

          index[key] =
            i;

        }

      }
    );


  return index;

}


/**
 * Khóa chống trùng:
 *
 * Số PO
 * +
 * MaKeToan
 */
function makePoIncomingKey_(
  maDonHang,
  MaKeToan
) {

  return (
    String(
      maDonHang ||
      ''
    )
      .trim()
      .toLowerCase()
    +
    '||'
    +
    String(
      MaKeToan ||
      ''
    )
      .trim()
      .toLowerCase()
  );

}


/**
 * Parse:
 *
 * Date object
 *
 * hoặc:
 * dd/MM/yyyy HH:mm:ss
 *
 * hoặc:
 * dd/MM/yyyy
 */
function parsePoDateTime_(
  value
) {

  if (!value) {
    return null;
  }


  /*
   * Nếu sheet trả thẳng Date.
   */
  if (
    Object.prototype
      .toString
      .call(
        value
      ) ===
      '[object Date]'
    &&
    !isNaN(
      value.getTime()
    )
  ) {

    return new Date(
      value.getTime()
    );

  }


  const text =
    String(
      value ||
      ''
    ).trim();


  /*
   * dd/MM/yyyy HH:mm:ss
   */
  let match =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/
    );


  if (match) {

    return new Date(

      Number(
        match[3]
      ),

      Number(
        match[2]
      ) - 1,

      Number(
        match[1]
      ),

      Number(
        match[4]
      ),

      Number(
        match[5]
      ),

      Number(
        match[6]
      )

    );

  }


  /*
   * dd/MM/yyyy
   */
  match =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );


  if (match) {

    return new Date(

      Number(
        match[3]
      ),

      Number(
        match[2]
      ) - 1,

      Number(
        match[1]
      )

    );

  }


  return null;

}


/**
 * Cộng ngày lịch.
 */
function addPoDays_(
  date,
  days
) {

  const result =
    new Date(
      date.getTime()
    );


  /*
   * Chỉ cần phần ngày
   * trong KeHoachHangVe.
   */
  result.setHours(
    0,
    0,
    0,
    0
  );


  result.setDate(
    result.getDate() +
    Number(
      days ||
      0
    )
  );


  return result;

}


/**
 * Người đang thao tác.
 *
 * Web App "Execute as Me"
 * đôi khi ActiveUser không trả email.
 *
 * Khi đó ghi:
 * Hệ thống
 */
function getPoCurrentUser_() {

  try {

    const email =
      Session
        .getActiveUser()
        .getEmail();


    if (
      email
    ) {

      return email;

    }

  } catch (error) {

    // Bỏ qua.

  }


  return 'Hệ thống';

}

function testDongBoKeHoachHangVeTuPO() {

  const maDonHangDat =
    'MDH-26082026-134425-083';


  const result =
    dongBoKeHoachHangVeTuPO_(
      maDonHangDat
    );


  Logger.log(
    JSON.stringify(
      result
    )
  );

}
