# Device batch entry

User request: create-device popup adds each form snapshot to a table underneath, keeps all input values, and saves the queued list once. Only new DanhMucThietBi rows use batch mode; edits/other menus retain existing single-row flow.

Implementation: local queue with duplicate check, row removal and discard confirmation; Save all ignores unqueued current input and retains queue on error. Up to100 rows. Server reuses prepareAdminData_ validation with cached related tables, injects validated virtual rows for intra-batch duplicates, validates all before one setValues append in physical header order, under authenticated script lock. Replay receipt includes the complete rows payload.

Verification: all11admin tests pass; Chrome verified unchanged form after adding, no RPC until Save all, duplicate rejection, remove, invalid batch/no writes, save valid queue despite invalid unqueued form, quantity0 and existing single-row edit. Desktop/phone screenshot inspected. Independent review found no substantive issues. Browser tests use fake data only, no live sheet sample rows inserted.
