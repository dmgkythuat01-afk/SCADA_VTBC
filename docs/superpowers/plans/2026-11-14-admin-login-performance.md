# Admin login performance

Live read-only baseline: account read 2104ms + snapshot 17284ms = 19388ms on 213 catalog rows. After request-local optimization: account read 595ms + snapshot 3784ms = 4379ms, with identical row counts. These are measured server times from one before/after run, excluding browser/network/platform startup latency.

Login now optionally returns its initial snapshot in the same authenticated RPC. The client requests this snapshot and falls back to the older two-call flow when absent. Session restoration still authenticates through adminApi.

Spreadsheet handle, signing secret and raw table reads are memoized only within the current request. loginAdmin and adminApi explicitly reset the context. Returned rows are copied to prevent cache mutation. Single writes, batch writes and deletes invalidate the affected table before the response snapshot. Account/role/password checks still reread on every authenticated request; no shared browser or cross-request credential cache was introduced.

Validation: 112 tests, browser CRUD and layout checks, read-only before/after benchmark with unchanged counts, focused code review. Temporary diagnostic deployments removed and canonical source restored. Backend/admin v84; mobile remains pinned to v78.
