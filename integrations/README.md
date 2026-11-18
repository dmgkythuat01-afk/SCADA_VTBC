# EpMangIn tray stock integration

`EpMangInViStock.js` belongs to Apps Script project `LuuCanBatch_V2` (script ID `1qyO9z2jm4U29hmZVq_-kSHVGCKrb_BWjtvoZqedHpH3FOGCDl01VRDiz`). The API source and credentials are maintained outside this repository; do not copy credentials here.

In `saveEpMangIn_`, inside its existing ScriptLock, before appending the validated rows:

```js
const viExport = epViPrepare_(ss, validRows.map(function(row) {
  return row.IdThungDungVi;
}), nowText_());
```

Immediately after `.setValues(values)` has appended EpMangIn:

```js
epViApply_(viExport);
```

The helper adds `daXuat` and `thoiGianXuat` headers if needed, validates all requested container IDs before the append, moves each container's full remaining quantity into the issued count, and stamps its first issue time. Repeated IDs do not reissue an empty container. Existing EpMangIn append semantics are retained; old records are not replayed. Each stock row update preserves other values and formulas in the edited span.

PCN stock displays remaining quantity only. Its separate progress card and existing assembly-progress calculation use remaining + issued quantity.

Worker quantity/location changes delegate to the same API via authenticated `updateViStockLocations` → `epViSaveLocations_`. Both that action and `saveEpMangIn_` take this project's ScriptLock, then read and validate current stock before writing. This prevents a stale worker save from restoring already-exported stock. Worker Script Properties hold `VTBC_STOCK_API_URL` and `VTBC_STOCK_API_TOKEN`; credentials never enter browser HTML or this repo. The owner must run `kiemTraKetNoiTonVi` once in the worker Apps Script editor and authorize the new external-request scope. Its smoke request is deliberately invalid and performs no inventory changes.
