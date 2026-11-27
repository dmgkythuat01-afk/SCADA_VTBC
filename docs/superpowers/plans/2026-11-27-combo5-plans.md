# PCN combo-5 carton plans

> **Execution:** implement inline with tests and one independent final review.

**Approved source:** Keep KetQuaLapVi positive remaining tray containers, just like film-print plans. New PCN menu only; worker scan workflow is not part of this request.

**Design:** Add Kế hoạch đóng thùng combo 5 next to film-print planning, with product selector, production-date-ordered available boxes, add/remove draft, editable positive integer Thùng kế hoạch, create/edit/cancel and plan detail/history. Use separate KeHoachDongThungCombo5 and ChiTietKeHoachDongThungCombo5 sheets and DTC5 timestamp IDs. Keep original film and legacy carton menus/data intact.

**Units decision:** Selected-container stock is in trays (vỉ). Target output is cartons (thùng). No packaging conversion was specified or found in current plan logic, so validate target as a positive integer without comparing carton count to tray count. Explain this on the form; never assume combo5 means five trays per carton.

**Shared invariants:** Reserve entire source boxes exclusively across combo5 and film plans under the existing API lock; cancellation releases them. Both menus ignore other-plan holds for FIFO, include own holds for editing, require old production dates first, and validate fresh stock/revisions. Existing worker film export must respect combo reservations without adding a combo worker menu. Create does not deduct inventory.

## Tasks
- [x] Tests: cross-menu hold conflict/release, create/edit/cancel/retry and failed staged write; FIFO and server-side stale checks; carton target independent of tray quantities; auth and compiled HTML.
- [x] Add optional combo table normalization to combined reservations; use in film reads/mutations and film worker export checks.
- [x] New focused Combo5PlansGs.js and Combo5PlansClient.html; lazy menu mount and minimal root wiring.
- [x] Route combo mutations through existing stock API with verified admin actor; deploy new core module and synchronize active external API source, never committing its bearer.
- [x] Append live new-sheet headers with backups/preservation checks; browser create/edit/cancel and cross-menu tests; independent review; verify/deploy existing PCN/API URLs; merge/push Git.

## Validation and release

- 107 PCN/worker regression tests passed, including combo source reservations, cancellation/retry, staged writes, FIFO, permissions and compiled HTML.
- Browser fixture verified create/edit/cancel, independent carton target, film exclusion/release and mobile field containment.
- Independent review found no release blockers. For an uncertain save response, retry unchanged content; if changing a committed request, reload and edit that plan rather than creating another one.
- Created `KeHoachDongThungCombo5` and `ChiTietKeHoachDongThungCombo5`. Existing film plans, detail rows, stock and EpMangIn values/formulas were unchanged by schema setup.
- PCN stable deployment v42; shared stock API v24. Exact deployed sources, public menu render, API ping and harmless combo routing validation passed. Active external API source synchronized from the preserved current cloud modules.

