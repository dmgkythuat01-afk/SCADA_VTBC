# PCN film-print selection by oldest production date

- Product-specific container options sort by normalized ngaySanXuat ascending, with stock ID as a stable same-date tie-breaker. Option labels put production date first.
- Adding a newer date is rejected while any earlier-date, positive-stock, unreserved box of the product remains outside the current draft. A message identifies the earliest date, count and an example box ID. After all earlier available boxes are selected, newer dates may join the same draft.
- Boxes held by other committed plans are unavailable and excluded; self-held boxes remain eligible during editing. Saving applies the same rule to the full selection, so removing an older box cannot bypass it. The shared API rechecks FIFO after detail staging under the existing lock.
- Existing worker exports are not retroactively revalidated against newer FIFO rules. No inventory deduction, C# nine-column event change or data migration is part of this change.
- Missing/invalid production dates fail explicitly rather than guessing. Read-only production audit found 117 positive mapped boxes and zero invalid dates. Date parsing covers Vietnamese dates, ISO dates and native Sheet Date values; invalid ISO calendar overflow is rejected before timezone conversion.
- All 102 PCN/worker tests passed. Browser fixture verified out-of-order month-boundary dates, add warnings, save-time removal guard, repaired draft and successful save. Independent review completed; shared API and PCN deployed on existing URLs and exact source/render verified.
