# Admin checklist entry from maintenance plan categories

The checklist editor now selects category names from DanhMucSoKH, scoped by workshop, machine, equipment code and assessment department. Parameter frequency is a read-only field derived from the selected category's tanSuatBaoDuong, independent of ThamSoHeThong frequency choices. The server revalidates the selection and frequency on save, rejecting stale or ambiguous source rows; existing orphaned criteria remain editable when their relation/frequency is unchanged.

The editor uses paired fields, a full-width parameter field and three assessment selectors on one desktop row, collapsing for phones. Batch entry retains current inputs and checks plan data once per batch. No Google Sheets data is migrated or modified by deployment.

Validation: 106 Node tests; real browser dropdown cascade, category/device/department resets, automatic frequency outside the old system list, two-row batch save and layouts at 1440/390px. Backend/admin v79; mobile stays pinned to v78 because no mobile change is required.
