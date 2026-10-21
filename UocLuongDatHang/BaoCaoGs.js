/*******************************************************
 * MODULE BÁO CÁO - DMG Ordering
 *
 * File backend riêng cho menu "Báo cáo".
 * Hiện tại mới tạo khung chung.
 *
 * Sau này các hàm lấy dữ liệu cho 3 báo cáo sẽ thêm ở đây:
 * 1. Forecast bán hàng
 * 2. Nhu cầu nguyên liệu
 * 3. Yêu cầu đặt hàng
 *******************************************************/

/**
 * Cấu hình chung của module Báo cáo.
 * Hiện chưa bắt buộc frontend phải gọi hàm này.
 */
function getBaoCaoModuleInit() {
  return {
    ok: true,
    menus: [
      {
        key: 'baoCaoForecastBanHang',
        label: 'Forecast bán hàng'
      },
      {
        key: 'baoCaoNhuCauNguyenLieu',
        label: 'Nhu cầu nguyên liệu'
      },
      {
        key: 'baoCaoYeuCauDatHang',
        label: 'Yêu cầu đặt hàng'
      }
    ]
  };
}


/*******************************************************
 * CÁC HÀM BACKEND BÁO CÁO SẼ THÊM Ở ĐÂY
 *******************************************************/

/*
function getBaoCaoForecastBanHang(filters) {
  // Sẽ làm ở prompt sau.
}

function getBaoCaoNhuCauNguyenLieu(filters) {
  // Sẽ làm ở prompt sau.
}

function getBaoCaoYeuCauDatHang(filters) {
  // Sẽ làm ở prompt sau.
}
*/

function getBaoCaoForecastBanHang(
  soTuanHienThi,
  khachHangFilter
) {
  soTuanHienThi =
    Number(
      soTuanHienThi || 4
    );

  const allowedWeeks =
    [4, 8, 12];

  if (
    !allowedWeeks.includes(
      soTuanHienThi
    )
  ) {
    soTuanHienThi = 4;
  }

  khachHangFilter =
    String(
      khachHangFilter || ''
    ).trim();


  /*
   * ==========================================
   * TUẦN HIỆN TẠI
   * ==========================================
   */

  const today =
    new Date();

  const startMonday =
    getMonday_(today);

  const weeks = [];

  for (
    let i = 0;
    i < soTuanHienThi;
    i++
  ) {
    const start =
      addDays_(
        startMonday,
        i * 7
      );

    weeks.push({
      index: i,

      nam:
        getISOWeekYear_(start),

      tuan:
        getISOWeek_(start),

      ngayDauTuan:
        fmtDate_(start),

      ngayCuoiTuan:
        fmtDate_(
          addDays_(
            start,
            6
          )
        )
    });
  }


  /*
   * ==========================================
   * ĐỌC KẾ HOẠCH BÁN HÀNG
   * ==========================================
   */

  const allRows =
    getSheetObjects_(
      APP.SHEETS.KE_HOACH_SX
    );


  /*
   * Chỉ lấy những dòng:
   * - có sản phẩm
   * - có tuần
   * - nằm trong khoảng forecast
   * - đúng khách hàng nếu có lọc
   */
  const weekKeySet =
    new Set(
      weeks.map(w =>
        w.nam +
        '|' +
        w.tuan
      )
    );


  const rows =
    allRows.filter(row => {
      if (!row.maSanPham) {
        return false;
      }

      const key =
        Number(row.nam || 0) +
        '|' +
        Number(row.tuan || 0);

      if (
        !weekKeySet.has(key)
      ) {
        return false;
      }

      if (
        khachHangFilter &&
        String(
          row.khachHang || ''
        ).trim() !==
        khachHangFilter
      ) {
        return false;
      }

      return true;
    });


  /*
   * ==========================================
   * DANH SÁCH KHÁCH HÀNG
   * ==========================================
   */

  const danhMuc =
    getDanhMucData_();

  const customers =
    danhMuc.khachHang || [];


  /*
   * ==========================================
   * GOM THEO SẢN PHẨM
   * ==========================================
   */

  const productMap = {};

  rows.forEach(row => {
    const maSanPham =
      String(
        row.maSanPham || ''
      ).trim();

    if (!maSanPham) {
      return;
    }

    if (
      !productMap[
        maSanPham
      ]
    ) {
      productMap[
        maSanPham
      ] = {
        maSanPham,

        tenSanPham:
          row.tenSanPham ||
          maSanPham,

        nhomSanPham:
          row.nhomSanPham ||
          '',

        customerMap: {}
      };
    }

    const customer =
      String(
        row.khachHang ||
        'Chưa xác định'
      ).trim();

    if (
      !productMap[
        maSanPham
      ].customerMap[
        customer
      ]
    ) {
      productMap[
        maSanPham
      ].customerMap[
        customer
      ] = {};
    }

    const weekKey =
      Number(row.nam || 0) +
      '|' +
      Number(row.tuan || 0);

    const qty =
      num_(
        row.soLuongKeHoach
      );

    productMap[
      maSanPham
    ].customerMap[
      customer
    ][weekKey] =
      (
        productMap[
          maSanPham
        ].customerMap[
          customer
        ][weekKey] ||
        0
      ) +
      qty;
  });


  /*
   * ==========================================
   * CHUYỂN THÀNH DỮ LIỆU FRONTEND
   * ==========================================
   */

  const products =
    Object.values(
      productMap
    )
      .sort(
        (a, b) =>
          String(
            a.tenSanPham || ''
          ).localeCompare(
            String(
              b.tenSanPham || ''
            ),
            'vi'
          )
      )
      .map(product => {
        const customerRows =
          Object.keys(
            product.customerMap
          )
            .sort(
              (a, b) =>
                String(a)
                  .localeCompare(
                    String(b),
                    'vi'
                  )
            )
            .map(customer => {
              const weekValues =
                {};

              weeks.forEach(w => {
                const key =
                  w.nam +
                  '|' +
                  w.tuan;

                weekValues[key] =
                  round3_(
                    num_(
                      product
                        .customerMap[
                          customer
                        ][key]
                    )
                  );
              });

              return {
                khachHang:
                  customer,

                weeks:
                  weekValues
              };
            });


        /*
         * Tổng theo sản phẩm.
         */
        const totalWeeks =
          {};

        weeks.forEach(w => {
          const key =
            w.nam +
            '|' +
            w.tuan;

          totalWeeks[key] =
            round3_(
              customerRows.reduce(
                (sum, row) =>
                  sum +
                  num_(
                    row.weeks[
                      key
                    ]
                  ),
                0
              )
            );
        });


        return {
          maSanPham:
            product.maSanPham,

          tenSanPham:
            product.tenSanPham,

          nhomSanPham:
            product.nhomSanPham,

          customerRows,

          totalWeeks
        };
      });


  return {
    ok: true,

    soTuanHienThi,

    khachHangFilter,

    weeks,

    customers,

    products
  };
}

function getBaoCaoNhuCauNguyenLieu(
  soTuanHienThi
) {
  soTuanHienThi =
    Number(
      soTuanHienThi || 4
    );

  const allowedWeeks =
    [4, 8, 12];

  if (
    !allowedWeeks.includes(
      soTuanHienThi
    )
  ) {
    soTuanHienThi = 4;
  }


  /*
   * ==========================================
   * 1. TẠO DANH SÁCH TUẦN
   * ==========================================
   */

  const today =
    new Date();

  const startMonday =
    getMonday_(today);

  const weeks = [];

  for (
    let i = 0;
    i < soTuanHienThi;
    i++
  ) {
    const start =
      addDays_(
        startMonday,
        i * 7
      );

    weeks.push({
      index: i,

      nam:
        getISOWeekYear_(start),

      tuan:
        getISOWeek_(start),

      ngayDauTuan:
        fmtDate_(start),

      ngayCuoiTuan:
        fmtDate_(
          addDays_(
            start,
            6
          )
        )
    });
  }


  /*
   * Key tuần để lọc nhanh.
   */
  const weekKeySet =
    new Set(
      weeks.map(w =>
        w.nam +
        '|' +
        w.tuan
      )
    );


  /*
   * ==========================================
   * 2. ĐƠN VỊ TÍNH TOÁN TỪ TONKHO
   * ==========================================
   */

  const tonKhoRows =
    getSheetObjects_(
      APP.SHEETS.TON_KHO
    );

  const tonDonViTinhToanMap = {};

  tonKhoRows.forEach(row => {
    const ma =
      String(
        row.maNguyenLieu || ''
      ).trim();

    if (!ma) return;

    const donVi =
      cleanDonVi_(
        row.doViTinhToan ||
        row.donVi ||
        ''
      );

    if (
      donVi &&
      !tonDonViTinhToanMap[ma]
    ) {
      tonDonViTinhToanMap[ma] =
        donVi;
    }
  });


  /*
   * ==========================================
   * 3. DANH MỤC NGUYÊN LIỆU
   * ==========================================
   */

  const nguyenLieuRows =
    getSheetObjects_(
      APP.SHEETS.NGUYEN_LIEU
    );

  const nguyenLieuMap =
    mapBy_(
      nguyenLieuRows,
      'maNguyenLieu'
    );


  /*
   * ==========================================
   * 4. QUY ĐỔI ĐƠN VỊ
   * ==========================================
   */

  const quyDoiDonViMap =
    getQuyDoiDonViMap_();

  const warnings = [];
  const warningSet = {};


  /*
   * ==========================================
   * 5. ĐỌC BOM
   * ==========================================
   */

  const bomByProduct = {};

  getSheetObjects_(
    APP.SHEETS.DINH_LUONG
  ).forEach(bom => {

    if (
      !bom.maSanPham ||
      !bom.maNguyenLieu
    ) {
      return;
    }

    /*
     * Chỉ lấy BOM đang dùng.
     */
    if (
      String(
        bom.trangThai || ''
      ).trim() !==
      'Dang dung'
    ) {
      return;
    }

    if (
      !bomByProduct[
        bom.maSanPham
      ]
    ) {
      bomByProduct[
        bom.maSanPham
      ] = [];
    }

    bomByProduct[
      bom.maSanPham
    ].push(bom);
  });


  /*
   * ==========================================
   * 6. ĐỌC KẾ HOẠCH BÁN HÀNG
   * ==========================================
   *
   * QUAN TRỌNG:
   * dùng soLuongSKU
   * KHÔNG dùng soLuongSKUThucHien.
   * ==========================================
   */

  const keHoachRows =
    getSheetObjects_(
      APP.SHEETS.KE_HOACH_SX
    )
      .filter(row => {
        if (!row.maSanPham) {
          return false;
        }

        const key =
          Number(
            row.nam || 0
          ) +
          '|' +
          Number(
            row.tuan || 0
          );

        return weekKeySet.has(
          key
        );
      });


  /*
   * ==========================================
   * 7. GOM SKU THEO:
   *
   * sản phẩm + tuần
   *
   * Nếu cùng sản phẩm có nhiều khách hàng
   * thì cộng tất cả soLuongSKU.
   * ==========================================
   */

  const skuByProductWeek = {};

  keHoachRows.forEach(row => {
    const maSanPham =
      String(
        row.maSanPham || ''
      ).trim();

    const weekKey =
      Number(
        row.nam || 0
      ) +
      '|' +
      Number(
        row.tuan || 0
      );

    const key =
      maSanPham +
      '|' +
      weekKey;


    /*
     * ĐÚNG THEO YÊU CẦU:
     * dùng soLuongSKU.
     */
    const sku =
      num_(
        row.soLuongSKU
      );


    skuByProductWeek[key] =
      (
        skuByProductWeek[key] ||
        0
      ) +
      sku;
  });


  /*
   * ==========================================
   * 8. TÍNH NHU CẦU NGUYÊN LIỆU
   * ==========================================
   */

  const productMap = {};


/*
 * ==========================================
 * DANH SÁCH SẢN PHẨM DUY NHẤT
 *
 * Một sản phẩm có thể có nhiều khách hàng,
 * nhưng BOM chỉ được tính 1 lần.
 * ==========================================
 */

  const uniqueProductMap = {};

  keHoachRows.forEach(kh => {

    const maSanPham =
      String(
        kh.maSanPham || ''
      ).trim();

    if (!maSanPham) {
      return;
    }

    if (!uniqueProductMap[maSanPham]) {

      uniqueProductMap[maSanPham] = {

        maSanPham:
          maSanPham,

        tenSanPham:
          kh.tenSanPham ||
          maSanPham

      };

    }

  });


  /*
  * Tính BOM theo từng sản phẩm duy nhất.
  */
  Object.values(
    uniqueProductMap
  ).forEach(kh => {

    const maSanPham =
      kh.maSanPham;


    /*
     * Tạo product một lần.
     */
    if (
      !productMap[
        maSanPham
      ]
    ) {
      productMap[
        maSanPham
      ] = {
        maSanPham:

          maSanPham,

        tenSanPham:
          kh.tenSanPham ||
          maSanPham,

        materialMap: {}
      };
    }


    const bomRows =
      bomByProduct[
        maSanPham
      ] || [];


    bomRows.forEach(bom => {

      const maNguyenLieu =
        String(
          bom.maNguyenLieu ||
          ''
        ).trim();

      if (!maNguyenLieu) {
        return;
      }


      const info =
        nguyenLieuMap[
          maNguyenLieu
        ] || {};


      /*
       * Đơn vị định lượng trong BOM.
       *
       * Ví dụ:
       * g/SKU
       * kg/SKU
       * cái/SKU
       */
      const donViNguon =
        cleanDonVi_(
          bom.donViDinhLuong ||
          ''
        );


      /*
       * Đơn vị hiển thị cuối cùng.
       *
       * Ưu tiên doViTinhToan từ TonKho.
       */
      const donViDich =
        cleanDonVi_(
          tonDonViTinhToanMap[
            maNguyenLieu
          ] ||
          info.doViTinhToan ||
          info.donVi ||
          donViNguon
        );


      /*
       * Ví dụ:
       *
       * g → kg = 0.001
       * ml → lit = 0.001
       */
      const heSoDonVi =
        getHeSoQuyDoiDonVi_(
          donViNguon,
          donViDich,
          quyDoiDonViMap,
          warnings,
          warningSet,
          {
            maSanPham:
              maSanPham,

            maNguyenLieu:
              maNguyenLieu,

            tenNguyenLieu:
              info.tenNguyenLieu ||
              bom.tenNguyenLieu ||
              maNguyenLieu
          }
        );


      /*
       * Tạo dòng nguyên liệu.
       */
      if (
        !productMap[
          maSanPham
        ].materialMap[
          maNguyenLieu
        ]
      ) {
        productMap[
          maSanPham
        ].materialMap[
          maNguyenLieu
        ] = {

          maNguyenLieu:
            maNguyenLieu,

          tenNguyenLieu:
            info.tenNguyenLieu ||
            bom.tenNguyenLieu ||
            maNguyenLieu,

          donVi:
            donViDich,

          weeks: {}
        };
      }


      /*
       * ======================================
       * TÍNH THEO TỪNG TUẦN
       * ======================================
       */

      weeks.forEach(w => {

        const weekKey =
          w.nam +
          '|' +
          w.tuan;

        const productWeekKey =
          maSanPham +
          '|' +
          weekKey;

        const soLuongSKU =
          num_(
            skuByProductWeek[
              productWeekKey
            ]
          );


        /*
        * CÔNG THỨC:
        *
        * Nhu cầu =
        * soLuongSKU
        * × dinhLuong1SKU
        * × heSoDonVi
        * × (1 + haoHutPhanTram / 100)
        */
        const haoHutPhanTram =
          num_(
            bom.haoHutPhanTram
          );

        const nhuCau =
          soLuongSKU *
          num_(
            bom.dinhLuong1SKU
          ) *
          heSoDonVi *
          (
            1 +
            haoHutPhanTram / 100
          );


        /*
         * Nếu cùng nguyên liệu xuất hiện
         * nhiều dòng BOM thì cộng lại.
         */
        productMap[
          maSanPham
        ].materialMap[
          maNguyenLieu
        ].weeks[
          weekKey
        ] =
          (
            productMap[
              maSanPham
            ].materialMap[
              maNguyenLieu
            ].weeks[
              weekKey
            ] ||
            0
          ) +
          nhuCau;
      });
    });
  });


  /*
   * ==========================================
   * 9. CHUYỂN DỮ LIỆU CHO FRONTEND
   * ==========================================
   */

  const products =
    Object.values(
      productMap
    )
      .sort(
        (a, b) =>
          String(
            a.tenSanPham || ''
          ).localeCompare(
            String(
              b.tenSanPham || ''
            ),
            'vi'
          )
      )
      .map(product => {

        const materials =
          Object.values(
            product.materialMap
          )
            .sort(
              (a, b) =>
                String(
                  a.tenNguyenLieu || ''
                ).localeCompare(
                  String(
                    b.tenNguyenLieu || ''
                  ),
                  'vi'
                )
            )
            .map(material => {

              const weekValues = {};


              weeks.forEach(w => {

                const key =
                  w.nam +
                  '|' +
                  w.tuan;


                weekValues[key] =
                  round3_(
                    material.weeks[
                      key
                    ] || 0
                  );

              });


              return {

                maNguyenLieu:
                  material.maNguyenLieu,

                tenNguyenLieu:
                  material.tenNguyenLieu,

                donVi:
                  material.donVi,

                weeks:
                  weekValues

              };
            });


        return {

          maSanPham:
            product.maSanPham,

          tenSanPham:
            product.tenSanPham,

          materials:
            materials

        };
      });


  /*
   * ==========================================
   * 10. RETURN
   * ==========================================
   */

  return {

    ok: true,

    soTuanHienThi:
      soTuanHienThi,

    weeks:
      weeks,

    products:
      products,

    warnings:
      warnings

  };
}

function getBaoCaoYeuCauDatHang(
  soTuanHienThi
) {
  soTuanHienThi =
    Number(
      soTuanHienThi || 4
    );

  const allowedWeeks =
    [4, 8, 12];

  if (
    !allowedWeeks.includes(
      soTuanHienThi
    )
  ) {
    soTuanHienThi = 4;
  }


  /*
   * ==========================================
   * 1. CẤU HÌNH TUẦN
   * ==========================================
   */

  const soTuanGiuCho = 2;


  /*
   * VD hiển thị 4 tuần:
   *
   * 35,36,37,38
   *
   * Backend vẫn tính thêm:
   *
   * 39,40
   *
   * để tuần 38 có thể giữ chỗ
   * cho tuần 39 + tuần 40.
   */
  const tongSoTuanTinh =
    soTuanHienThi +
    soTuanGiuCho;


  const today =
    new Date();

  const startMonday =
    getMonday_(
      today
    );


  const calcWeeks = [];


  for (
    let i = 0;
    i < tongSoTuanTinh;
    i++
  ) {

    const start =
      addDays_(
        startMonday,
        i * 7
      );


    calcWeeks.push({

      index:
        i,

      nam:
        getISOWeekYear_(
          start
        ),

      tuan:
        getISOWeek_(
          start
        ),

      start:
        start,

      end:
        addDays_(
          start,
          6
        ),

      ngayDauTuan:
        fmtDate_(
          start
        ),

      ngayCuoiTuan:
        fmtDate_(
          addDays_(
            start,
            6
          )
        ),

      isVisible:
        i < soTuanHienThi

    });

  }


  const weeks =
    calcWeeks.filter(
      w =>
        w.isVisible
    );


  /*
   * ==========================================
   * 2. TONKHO
   * ==========================================
   */

  const tonKhoRows =
    getSheetObjects_(
      APP.SHEETS.TON_KHO
    )
      .filter(row =>
        row.maNguyenLieu &&
        row.MaKeToan
      );


  const nguyenLieuMap =
    mapBy_(
      getSheetObjects_(
        APP.SHEETS.NGUYEN_LIEU
      ),
      'maNguyenLieu'
    );


  /*
   * ==========================================
   * 3. TỒN THỰC TẾ FILE 2
   * ==========================================
   */

  const actualResult =
    getTonThucTeMap_();

  const actualMap =
    actualResult.map || {};


  /*
   * ==========================================
   * 4. MAP THÔNG TIN TONKHO
   * ==========================================
   */

  const tonInfoMap = {};


  tonKhoRows.forEach(
    row => {

      const ma =
        String(
          row.maNguyenLieu ||
          ''
        ).trim();


      if (!ma) {
        return;
      }


      const heSo =
        (
          row.heSoQuyDoiKho === '' ||
          row.heSoQuyDoiKho === null ||
          row.heSoQuyDoiKho === undefined
        )
          ? 1
          : num_(
              row.heSoQuyDoiKho
            );


      tonInfoMap[
        ma
      ] = {

        maNguyenLieu:
          ma,

        MaKeToan:
          String(
            row.MaKeToan ||
            ''
          ).trim(),

        tenNguyenLieu:
          row.tenNguyenLieu ||
          (
            nguyenLieuMap[
              ma
            ]
              ?.tenNguyenLieu
          ) ||
          ma,


        /*
         * Đơn vị kho / đơn vị đặt hàng.
         */
        donVi:
          cleanDonVi_(
            row.donVi ||
            ''
          ),


        /*
         * Đơn vị dùng tính BOM.
         */
        doViTinhToan:
          cleanDonVi_(
            row.doViTinhToan ||
            row.donVi ||
            ''
          ),


        heSoQuyDoiKho:
          heSo || 1,


        /*
         * Snapshot đầu tuần.
         */
        tonDauTuan:
          num_(
            row.khoiLuongNhap
          ),


        /*
         * Leadtime.
         */
        leadtime:
          Math.max(
            0,
            num_(
              row.soNgayVeKho
            )
          )

      };

    }
  );


  /*
   * ==========================================
   * 5. QUY ĐỔI ĐƠN VỊ BOM
   * ==========================================
   */

  const quyDoiDonViMap =
    getQuyDoiDonViMap_();

  const warnings = [];

  const warningSet = {};


  /*
   * ==========================================
   * 6. BOM THEO SẢN PHẨM
   * ==========================================
   */

  const bomByProduct = {};


  getSheetObjects_(
    APP.SHEETS.DINH_LUONG
  ).forEach(
    bom => {

      if (
        !bom.maSanPham ||
        !bom.maNguyenLieu
      ) {
        return;
      }


      if (
        String(
          bom.trangThai ||
          ''
        ).trim() !==
        'Dang dung'
      ) {
        return;
      }


      if (
        !bomByProduct[
          bom.maSanPham
        ]
      ) {

        bomByProduct[
          bom.maSanPham
        ] = [];

      }


      bomByProduct[
        bom.maSanPham
      ].push(
        bom
      );

    }
  );


  /*
   * ==========================================
   * 7. NHU CẦU NGUYÊN LIỆU
   *
   * key:
   * weekIndex|maNguyenLieu
   *
   * Đơn vị cuối:
   * donVi của TonKho.
   * ==========================================
   */

  const demand = {};


  /*
   * Ngày cần dùng sớm nhất
   * trong từng tuần.
   */
  const firstNeedDate = {};


  getSheetObjects_(
    APP.SHEETS.KE_HOACH_SX
  ).forEach(
    kh => {

      if (
        !kh.maSanPham
      ) {
        return;
      }


      /*
       * Chỉ kế hoạch đã duyệt.
       */
      if (
        String(
          kh.trangThai ||
          ''
        ).trim() !==
        'Da duyet'
      ) {
        return;
      }


      const khNam =
        Number(
          kh.nam ||
          0
        );


      const khTuan =
        Number(
          kh.tuan ||
          0
        );


      const week =
        calcWeeks.find(
          w =>
            Number(
              w.nam
            ) === khNam
            &&
            Number(
              w.tuan
            ) === khTuan
        );


      if (!week) {
        return;
      }


      /*
       * Forecast dùng soLuongSKU.
       */
      const soLuongSKU =
        num_(
          kh.soLuongSKU
        );


      if (
        soLuongSKU <= 0
      ) {
        return;
      }


      const bomRows =
        bomByProduct[
          kh.maSanPham
        ] || [];


      const ngaySX =
        toDate_(
          kh.ngaySanXuatDuKien
        )
        ||
        toDate_(
          kh.ngayDauTuan
        )
        ||
        week.start;


      bomRows.forEach(
        bom => {

          const ma =
            String(
              bom.maNguyenLieu ||
              ''
            ).trim();


          const tonInfo =
            tonInfoMap[
              ma
            ];


          if (!tonInfo) {
            return;
          }


          /*
           * Đơn vị BOM.
           */
          const donViNguon =
            cleanDonVi_(
              bom.donViDinhLuong ||
              ''
            );


          const donViTinhToan =
            tonInfo.doViTinhToan ||
            donViNguon;


          /*
           * BOM
           * → doViTinhToan.
           */
          const heSoBomToTinhToan =
            getHeSoQuyDoiDonVi_(
              donViNguon,
              donViTinhToan,
              quyDoiDonViMap,
              warnings,
              warningSet,
              {

                maSanPham:
                  kh.maSanPham,

                maNguyenLieu:
                  ma,

                tenNguyenLieu:
                  tonInfo
                    .tenNguyenLieu

              }
            );


          /*
           * Nhu cầu theo
           * doViTinhToan.
           *
           * Có hao hụt.
           */
          const nhuCauTinhToan =
            soLuongSKU
            *
            num_(
              bom.dinhLuong1SKU
            )
            *
            heSoBomToTinhToan
            *
            (
              1 +
              num_(
                bom.haoHutPhanTram
              ) / 100
            );


          /*
           * Quy về donVi kho.
           *
           * VD:
           * 1 thùng = 20 kg
           *
           * 100 kg
           * → 5 thùng.
           */
          const heSoKho =
            tonInfo
              .heSoQuyDoiKho ||
            1;


          const nhuCauDonViKho =
            nhuCauTinhToan /
            heSoKho;


          const key =
            week.index +
            '|' +
            ma;


          demand[
            key
          ] =
            (
              demand[
                key
              ] ||
              0
            )
            +
            nhuCauDonViKho;


          /*
           * Ngày cần dùng
           * sớm nhất của tuần.
           */
          if (
            !firstNeedDate[
              key
            ]
            ||
            ngaySX <
              firstNeedDate[
                key
              ]
          ) {

            firstNeedDate[
              key
            ] =
              ngaySX;

          }

        }
      );

    }
  );


  /*
   * ==========================================
   * 8. HÀNG VỀ
   * ==========================================
   */

  const inbound = {};


  getSheetObjects_(
    APP.SHEETS.HANG_VE
  ).forEach(
    hv => {

      if (
        !hv.maNguyenLieu
      ) {
        return;
      }


      if (
        String(
          hv.trangThai ||
          ''
        ).trim() !==
        'Dang ve'
      ) {
        return;
      }


      const ngayVe =
        toDate_(
          hv.ngayDuKienVe
        );


      if (!ngayVe) {
        return;
      }


      const index =
        weekIndexOf_(
          ngayVe,
          startMonday,
          tongSoTuanTinh
        );


      if (
        index < 0
      ) {
        return;
      }


      const ma =
        String(
          hv.maNguyenLieu ||
          ''
        ).trim();


      if (
        !tonInfoMap[
          ma
        ]
      ) {
        return;
      }


      const key =
        index +
        '|' +
        ma;


      inbound[
        key
      ] =
        (
          inbound[
            key
          ] ||
          0
        )
        +
        num_(
          hv.soLuongVeDuKien
        );

    }
  );


  /*
   * ==========================================
   * 9. TÍNH TỪNG NGUYÊN LIỆU
   * ==========================================
   */

  const rows = [];


  tonKhoRows.forEach(
    tonRow => {

      const ma =
        String(
          tonRow.maNguyenLieu ||
          ''
        ).trim();


      const info =
        tonInfoMap[
          ma
        ];


      if (!info) {
        return;
      }


      /*
       * ======================================
       * TỒN THỰC TẾ FILE 2
       * ======================================
       */

      const actualKey =
        makeKhoNguyenLieuKey_(
          ma,
          info.MaKeToan
        );


      const actual =
        actualMap[
          actualKey
        ] || {};


      /*
       * tongKhoiLuongNhap
       * là đơn vị kho.
       */
      const tonThucTe =
        round3_(
          num_(
            actual
              .tongKhoiLuongNhap
          )
        );


      /*
       * Snapshot đầu tuần.
       */
      const tonDauTuan =
        round3_(
          info.tonDauTuan
        );


      /*
       * Running tồn vật lý.
       */
      let runningTon =
        tonDauTuan;


      const weekValues = [];


      /*
       * Candidate PO sớm nhất.
       */
      let earliestOrderCandidate =
        null;


      /*
       * ======================================
       * CHẠY TỪNG TUẦN
       * ======================================
       */

      calcWeeks.forEach(
        w => {

          const key =
            w.index +
            '|' +
            ma;


          const nhuCau =
            round3_(
              num_(
                demand[
                  key
                ]
              )
            );


          const hangVe =
            round3_(
              num_(
                inbound[
                  key
                ]
              )
            );


          /*
           * Tồn vật lý cuối tuần.
           */
          const tonCuoi =
            round3_(
              runningTon
              +
              hangVe
              -
              nhuCau
            );


          /*
           * ==================================
           * MÔ PHỎNG GIỮ CHỖ
           *
           * Tuần N nhìn:
           * N+1 và N+2.
           *
           * Không tác động runningTon thật.
           * ==================================
           */

          let reserveRunning =
            tonCuoi;


          let nhuCauGiuCho = 0;


          let shortageInfo =
            null;


          /*
           * ==================================
           * A. BẢN THÂN TUẦN N ĐÃ THIẾU
           * ==================================
           */

          if (
            tonCuoi < 0
          ) {

            shortageInfo = {

              /*
               * Tuần phát hiện.
               */
              namKichHoat:
                w.nam,

              tuanKichHoat:
                w.tuan,

              ngayKichHoat:
                w.start,


              /*
               * Tuần thực sự thiếu.
               */
              namThieu:
                w.nam,

              tuanThieu:
                w.tuan,

              ngayCanDung:
                firstNeedDate[
                  key
                ] ||
                w.start,

              soLuongThieu:
                Math.abs(
                  tonCuoi
                )

            };

          }


          /*
           * ==================================
           * B. TUẦN N CHƯA THIẾU
           *
           * → xét N+1, N+2.
           * ==================================
           */

          if (
            !shortageInfo
          ) {

            for (
              let offset = 1;
              offset <= soTuanGiuCho;
              offset++
            ) {

              const reserveIndex =
                w.index +
                offset;


              if (
                reserveIndex >=
                calcWeeks.length
              ) {
                break;
              }


              const reserveWeek =
                calcWeeks[
                  reserveIndex
                ];


              const reserveKey =
                reserveIndex +
                '|' +
                ma;


              const reserveDemand =
                round3_(
                  num_(
                    demand[
                      reserveKey
                    ]
                  )
                );


              const reserveInbound =
                round3_(
                  num_(
                    inbound[
                      reserveKey
                    ]
                  )
                );


              /*
               * Tổng nhu cầu giữ chỗ.
               *
               * Chỉ để debug/display.
               */
              nhuCauGiuCho =
                round3_(
                  nhuCauGiuCho +
                  reserveDemand
                );


              /*
               * Mô phỏng tuần tương lai:
               *
               * tồn trước
               * + hàng về
               * - nhu cầu.
               */
              reserveRunning =
                round3_(
                  reserveRunning
                  +
                  reserveInbound
                  -
                  reserveDemand
                );


              /*
               * Tuần đầu tiên bị âm
               * = tuần thiếu thực tế.
               */
              if (
                reserveRunning < 0
              ) {

                shortageInfo = {

                  /*
                   * QUAN TRỌNG:
                   *
                   * Việc đặt hàng được
                   * KÍCH HOẠT từ tuần w.
                   *
                   * VD:
                   * đang xét T38,
                   * giữ T39 + T40,
                   * âm ở T40
                   *
                   * → kích hoạt T38.
                   */
                  namKichHoat:
                    w.nam,

                  tuanKichHoat:
                    w.tuan,

                  ngayKichHoat:
                    w.start,


                  /*
                   * Nhưng tuần thực sự thiếu
                   * là reserveWeek.
                   */
                  namThieu:
                    reserveWeek.nam,

                  tuanThieu:
                    reserveWeek.tuan,

                  ngayCanDung:
                    firstNeedDate[
                      reserveKey
                    ] ||
                    reserveWeek.start,

                  soLuongThieu:
                    Math.abs(
                      reserveRunning
                    )

                };


                /*
                 * Đã tìm được tuần thiếu
                 * đầu tiên.
                 */
                break;

              }

            }

          }


          /*
           * Tồn khả dụng sau giữ chỗ.
           *
           * Chỉ debug.
           */
          const tonKhaDungSauGiuCho =
            round3_(
              reserveRunning
            );


          /*
          * ==================================
          * C. TÍNH PO
          * ==================================
          *
          * QUY TẮC:
          *
          * Nếu tuần N phát hiện cần đặt hàng
          * do bản thân tuần N thiếu
          * hoặc do giữ chỗ N+1, N+2,
          *
          * thì:
          *
          * Ngày nhập kho dự kiến
          * = NGÀY ĐẦU TUẦN KÍCH HOẠT N
          *
          * Ngày PO
          * = Ngày nhập kho dự kiến
          *   - Leadtime
          *
          * VD:
          *
          * Đặt từ tuần 38
          * Tuần 38:
          * 14/09/2026 → 20/09/2026
          *
          * Leadtime = 30 ngày
          *
          * Ngày nhập dự kiến:
          * 14/09/2026
          *
          * Ngày PO:
          * 15/08/2026
          * ==================================
          */

          if (
            shortageInfo
          ) {

            /*
            * ==================================
            * 1. NGÀY NHẬP KHO DỰ KIẾN
            * ==================================
            *
            * Lấy ngày ĐẦU của tuần
            * kích hoạt đặt hàng.
            *
            * w.start chính là thứ 2
            * đầu tuần đang xét.
            */
            const ngayNhapKhoDuKien =
              new Date(
                w.start
              );


            /*
            * ==================================
            * 2. NGÀY CẦN ĐẶT PO
            * ==================================
            *
            * PO =
            * ngày nhập kho dự kiến
            * - leadtime
            */
            const ngayCanDat =
              addDays_(
                ngayNhapKhoDuKien,
                -info.leadtime
              );


            /*
            * ==================================
            * 3. NGÀY CẦN DÙNG THỰC TẾ
            * ==================================
            *
            * Chỉ giữ để debug / truy vết.
            *
            * Không dùng ngày thiếu thực tế
            * để tính PO nữa.
            */
            const ngayCanDungThucTe =
              shortageInfo
                .ngayCanDung;


            /*
            * ==================================
            * 4. CHỈ GIỮ PO SỚM NHẤT
            * ==================================
            */

            if (
              !earliestOrderCandidate
              ||
              ngayCanDat <
                earliestOrderCandidate
                  .ngayCanDatDate
            ) {

              earliestOrderCandidate = {

                /*
                * Ngày PO chính thức.
                */
                ngayCanDatDate:
                  ngayCanDat,


                /*
                * Giữ field cũ để không ảnh hưởng
                * frontend hoặc debug khác.
                */
                ngayCanDatTheoLeadtimeDate:
                  ngayCanDat,


                /*
                * Ngày đầu tuần kích hoạt đặt.
                */
                ngayKichHoatDatDate:
                  shortageInfo
                    .ngayKichHoat,


                /*
                * Ngày cần dùng thực tế
                * của tuần thiếu.
                */
                ngayCanDungDate:
                  ngayCanDungThucTe,


                /*
                * Ngày nhập kho dự kiến:
                * ĐẦU tuần kích hoạt.
                */
                ngayNhapKhoDuKienDate:
                  ngayNhapKhoDuKien,


                /*
                * Tuần kích hoạt đặt.
                */
                namKichHoat:
                  shortageInfo
                    .namKichHoat,

                tuanKichHoat:
                  shortageInfo
                    .tuanKichHoat,


                /*
                * Tuần thiếu thực tế.
                */
                namThieu:
                  shortageInfo
                    .namThieu,

                tuanThieu:
                  shortageInfo
                    .tuanThieu,


                /*
                * Số lượng thiếu.
                */
                soLuongThieu:
                  round3_(
                    shortageInfo
                      .soLuongThieu
                  )

              };

            }

          }


          /*
           * ==================================
           * RUNNING TỒN
           *
           * Chỉ tồn vật lý chuyển tuần.
           * Giữ chỗ KHÔNG làm giảm runningTon.
           * ==================================
           */

          runningTon =
            tonCuoi;


          /*
           * ==================================
           * DATA FRONTEND
           * ==================================
           */

          if (
            w.isVisible
          ) {

            weekValues.push({

              nam:
                w.nam,

              tuan:
                w.tuan,

              nhuCau:
                nhuCau,

              hangVe:
                hangVe,

              tonCuoi:
                tonCuoi,

              /*
               * Debug.
               */
              nhuCauGiuCho:
                nhuCauGiuCho,

              tonKhaDungSauGiuCho:
                tonKhaDungSauGiuCho,

              /*
               * Cho frontend/debug biết
               * tuần này có kích hoạt
               * đặt hàng hay không.
               */
              kichHoatDat:
                Boolean(
                  shortageInfo
                ),

              tuanThieuDoGiuCho:
                shortageInfo
                  ? shortageInfo
                      .tuanThieu
                  : ''

            });

          }

        }
      );


      /*
       * ======================================
       * RETURN ROW
       * ======================================
       */

      rows.push({

        maNguyenLieu:
          ma,

        MaKeToan:
          info.MaKeToan,

        tenNguyenLieu:
          info.tenNguyenLieu,

        donVi:
          info.donVi,

        tonDauTuan:
          tonDauTuan,

        tonThucTe:
          tonThucTe,

        leadtime:
          info.leadtime,

        weeks:
          weekValues,


        /*
         * Ngày PO cuối cùng.
         */
        ngayCanDat:
          earliestOrderCandidate
            ? fmtDate_(
                earliestOrderCandidate
                  .ngayCanDatDate
              )
            : '',


        /*
         * Debug thêm:
         * ngày PO theo leadtime.
         */
        ngayCanDatTheoLeadtime:
          earliestOrderCandidate
            ? fmtDate_(
                earliestOrderCandidate
                  .ngayCanDatTheoLeadtimeDate
              )
            : '',


        /*
         * Ngày bắt đầu tuần
         * kích hoạt giữ chỗ.
         */
        ngayKichHoatDat:
          earliestOrderCandidate
            ? fmtDate_(
                earliestOrderCandidate
                  .ngayKichHoatDatDate
              )
            : '',


        /*
         * Ngày cần dùng thật.
         */
        ngayCanDung:
          earliestOrderCandidate
            ? fmtDate_(
                earliestOrderCandidate
                  .ngayCanDungDate
              )
            : '',


        /*
         * Ngày nhập dự kiến.
         */
        ngayNhapKhoDuKien:
          earliestOrderCandidate
            ? fmtDate_(
                earliestOrderCandidate
                  .ngayNhapKhoDuKienDate
              )
            : '',


        /*
         * TUẦN KÍCH HOẠT ĐẶT.
         *
         * VD: 38.
         */
        tuanKichHoatDat:
          earliestOrderCandidate
            ? earliestOrderCandidate
                .tuanKichHoat
            : '',


        namKichHoatDat:
          earliestOrderCandidate
            ? earliestOrderCandidate
                .namKichHoat
            : '',


        /*
         * TUẦN THIẾU THỰC TẾ.
         *
         * VD: 40.
         */
        tuanThieuSomNhat:
          earliestOrderCandidate
            ? earliestOrderCandidate
                .tuanThieu
            : '',


        namThieuSomNhat:
          earliestOrderCandidate
            ? earliestOrderCandidate
                .namThieu
            : '',


        soLuongThieu:
          earliestOrderCandidate
            ? round3_(
                earliestOrderCandidate
                  .soLuongThieu
              )
            : 0,


        canDat:
          Boolean(
            earliestOrderCandidate
          )

      });

    }
  );


  /*
   * ==========================================
   * 10. SORT
   * ==========================================
   */

  rows.sort(
    (a, b) =>
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


  /*
   * ==========================================
   * 11. RETURN
   * ==========================================
   */

  return {

    ok:
      true,

    soTuanHienThi:
      soTuanHienThi,

    soTuanGiuCho:
      soTuanGiuCho,


    weeks:
      weeks.map(
        w => ({

          nam:
            w.nam,

          tuan:
            w.tuan,

          ngayDauTuan:
            w.ngayDauTuan,

          ngayCuoiTuan:
            w.ngayCuoiTuan

        })
      ),


    rows:
      rows,


    warnings:
      warnings,


    /*
     * ======================================
     * DÒNG KHO FILE 2 KHÔNG MAP
     * ======================================
     */

    invalidExternalRows:
      (
        actualResult.invalidRows ||
        []
      ).length,


    invalidExternalRowDetails:
      (
        actualResult.invalidRows ||
        []
      )
        .slice(
          0,
          50
        )
        .map(
          item => ({

            maNguyenLieu:
              item.maNguyenLieu ||
              '',

            MaKeToan:
              item.MaKeToan ||
              '',

            tenNguyenLieu:
              item.tenNguyenLieu ||
              '',

            khoiLuongNhap:
              item.khoiLuongNhap ??
              '',

            donVi:
              item.donVi ||
              '',

            LotNo:
              item.LotNo ||
              '',

            ngayNhap:
              item.ngayNhap
                ? fmtDate_(
                    toDate_(
                      item.ngayNhap
                    )
                  )
                : ''

          })
        )

  };
}

