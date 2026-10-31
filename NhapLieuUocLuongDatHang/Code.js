// ============================================================
// DMG MASTER DATA
// CODE.GS
// ============================================================


// ============================================================
// 1. CẤU HÌNH
// ============================================================

const MASTER_CONFIG = {

  // ==========================================================
  // DÁN GOOGLE SHEET ID CỦA BẠN VÀO ĐÂY
  // ==========================================================

  SHEET_ID:
    '1eYabwzrO_ceaMfsgBkjdHs0tgPJqMimwcX-l6EeniCQ',


  SHEET_TAI_KHOAN:
    'TaiKhoan',


  APP_NAME:
    'DMG Master Data',


  COMPANY_NAME:
    'CÔNG TY TNHH ĐỨC MINH ĐỒNG NAI'

};


// ============================================================
// 2. MỞ GOOGLE SHEET
// ============================================================

function getMasterSpreadsheet_() {

  return SpreadsheetApp.openById(
    MASTER_CONFIG.SHEET_ID
  );

}


// ============================================================
// 3. WEB APP
// ============================================================

function doGet() {

  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle(
      'DMG | Dữ liệu gốc'
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );

}


// ============================================================
// 4. INCLUDE HTML
// ============================================================

function include(filename) {

  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();

}


// ============================================================
// 5. CHUYỂN SHEET THÀNH OBJECT
// ============================================================

function getSheetObjects_(sheetName) {

  const ss =
    getMasterSpreadsheet_();

  const sheet =
    ss.getSheetByName(sheetName);


  if (!sheet) {

    throw new Error(
      'Không tìm thấy sheet: ' +
      sheetName
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

    return [];

  }


  const headers =
    values[0].map(
      x => String(x || '').trim()
    );


  return values
    .slice(1)

    .filter(row =>
      row.some(
        cell =>
          String(cell || '').trim() !== ''
      )
    )

    .map(row => {

      const obj = {};

      headers.forEach(
        (header, index) => {

          if (!header) return;

          obj[header] =
            row[index];

        }
      );

      return obj;

    });

}


// ============================================================
// 6. ĐĂNG NHẬP
// ============================================================

function masterLogin(
  tenDangNhap,
  matKhau
) {

  tenDangNhap =
    String(
      tenDangNhap || ''
    ).trim();


  matKhau =
    String(
      matKhau || ''
    ).trim();


  if (!tenDangNhap) {

    return {
      ok: false,
      message:
        'Vui lòng nhập tên đăng nhập.'
    };

  }


  if (!matKhau) {

    return {
      ok: false,
      message:
        'Vui lòng nhập mật khẩu.'
    };

  }


  const accounts =
    getSheetObjects_(
      MASTER_CONFIG.SHEET_TAI_KHOAN
    );


  const account =
    accounts.find(row => {

      const user =
        String(
          row.tenDangNhap || ''
        ).trim();


      const pass =
        String(
          row.MatKhau || ''
        ).trim();


      return (
        user.toLowerCase() ===
          tenDangNhap.toLowerCase()
        &&
        pass === matKhau
      );

    });


  if (!account) {

    return {
      ok: false,
      message:
        'Tên đăng nhập hoặc mật khẩu không đúng.'
    };

  }


  const role =
    String(
      account.Role || ''
    ).trim();


  const hoVaTen =
    String(
      account.hoVaTen ||
      account.tenDangNhap ||
      ''
    ).trim();


  if (!role) {

    return {
      ok: false,
      message:
        'Tài khoản chưa được phân quyền.'
    };

  }


  return {

    ok: true,

    user: {

      tenDangNhap:
        String(
          account.tenDangNhap || ''
        ).trim(),

      hoVaTen:
        hoVaTen,

      role:
        role

    }

  };

}


// ============================================================
// 7. KIỂM TRA KẾT NỐI
// ============================================================

function testMasterConnection() {

  const ss =
    getMasterSpreadsheet_();


  return {

    ok: true,

    spreadsheetName:
      ss.getName(),

    spreadsheetId:
      ss.getId()

  };

}
