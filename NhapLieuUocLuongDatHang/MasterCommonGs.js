/**************************************************************
 * MASTER DATA - COMMON BACKEND
 *
 * Dùng chung cho toàn bộ trang nhập dữ liệu gốc.
 **************************************************************/


/**
 * ============================================================
 * CẤU HÌNH QUYỀN
 * ============================================================
 */
const MASTER_ROLE_PERMISSION = {

  keToan: [
    'Admin',
    'KeToan'
  ],

  pcn: [
    'Admin',
    'PCN'
  ],

  kho: [
    'Admin',
    'Kho',
    'PhongMua'
  ],

  phongBan: [
    'Admin',
    'PhongBanHang'
  ],

  phongMua: [
    'Admin',
    'PhongMua'
  ]

};


/**
 * ============================================================
 * KIỂM TRA ROLE CÓ QUYỀN VÀO MODULE KHÔNG
 * ============================================================
 */
function masterCoQuyen_(role, moduleName) {

  role =
    String(role || '')
      .trim();

  moduleName =
    String(moduleName || '')
      .trim();


  if (!role || !moduleName) {
    return false;
  }


  const allowedRoles =
    MASTER_ROLE_PERMISSION[moduleName] ||
    [];


  return allowedRoles.includes(role);

}


/**
 * ============================================================
 * LẤY DANH SÁCH MENU THEO ROLE
 * ============================================================
 *
 * Frontend dùng kết quả này để:
 * - hiện menu đúng quyền
 * - Admin hiện toàn bộ
 */
function getMasterMenuTheoRole(role) {

  role =
    String(role || '')
      .trim();


  const menus = [

    {
      id: 'keToan',
      title: 'Nhập dữ liệu kế toán',
      icon: '🧾'
    },

    {
      id: 'pcn',
      title: 'Nhập dữ liệu PCN',
      icon: '🏭'
    },

    {
      id: 'kho',
      title: 'Nhập dữ liệu Kho',
      icon: '📦'
    },

    {
      id: 'phongBan',
      title: 'Nhập dữ liệu phòng bán',
      icon: '📊'
    },

    {
      id: 'phongMua',
      title: 'Nhập dữ liệu phòng mua',
      icon: '🛒'
    }

  ];


  return menus.filter(item =>
    masterCoQuyen_(
      role,
      item.id
    )
  );

}


/**
 * ============================================================
 * KIỂM TRA QUYỀN TỪ BACKEND
 * ============================================================
 *
 * QUAN TRỌNG:
 * Không chỉ ẩn menu ở HTML.
 *
 * Sau này tất cả hàm lưu/xóa/sửa dữ liệu cũng phải gọi
 * hàm kiểm tra quyền backend.
 */
function masterKiemTraQuyen_(
  role,
  moduleName
) {

  if (
    !masterCoQuyen_(
      role,
      moduleName
    )
  ) {

    throw new Error(
      'Bạn không có quyền truy cập chức năng này.'
    );

  }


  return true;

}
