# Admin maintenance plan catalog

Adds Nhập dữ liệu → Danh mục sổ kế hoạch with header-driven DanhMucSoKH CRUD, filters, queued batch creation and duplicate checks. The unique key is workshop/machine/device code/device name/category/assessment department; changing frequencies or action type does not allow a duplicate.

Device code/name selects synchronize using the current workshop/machine equipment list. Both frequencies use ThamSoHeThong.tanSuat; type uses ThamSoHeThong.loaiSoKHDB; department remains Điện/Cơ khí. Required frequencies follow Cả 2/Thay mới/Bảo dưỡng; unused frequencies may be blank. Server validates all dependencies and derives canonical device names. Referenced workshop/machine/equipment renames/deletes also respect the plan catalog.

Child navigation is indented beneath Nhập dữ liệu. Existing sheet data is preserved; no setup/migration is necessary. Validation: parameter-list and CRUD/duplicate tests, browser batch creation/edit/delete, name/code synchronization and desktop/mobile layout. Admin backend v80; mobile stays pinned to v78.
